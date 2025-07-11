import {Instrument} from "../Instrument";
import {MusicSheet} from "../MusicSheet";
import {VoiceGenerator} from "./VoiceGenerator";
import {Staff} from "../VoiceData/Staff";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {MusicSheetReadingException} from "../Exceptions";
import {ClefEnum} from "../VoiceData/Instructions/ClefInstruction";
import {RhythmSymbolEnum} from "../VoiceData/Instructions/RhythmInstruction";
import {KeyEnum} from "../VoiceData/Instructions/KeyInstruction";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import log from "loglevel";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {ChordSymbolReader} from "./MusicSymbolModules/ChordSymbolReader";
import {ExpressionReader} from "./MusicSymbolModules/ExpressionReader";
import {RepetitionInstructionReader} from "./MusicSymbolModules/RepetitionInstructionReader";
import {SlurReader} from "./MusicSymbolModules/SlurReader";
import {StemDirectionType} from "../VoiceData/VoiceEntry";
import {NoteType, NoteTypeHandler} from "../VoiceData/NoteType";
import { SystemLinesEnumHelper } from "../Graphical/SystemLinesEnum";
import { ReaderPluginManager } from "./ReaderPluginManager";
import { TremoloInfo } from "../VoiceData/Note";
// import {Dictionary} from "typescript-collections";

// FIXME: The following classes are missing
//type ChordSymbolContainer = any;
//type SlurReader = any;
//type RepetitionInstructionReader = any;
//declare class MusicSymbolModuleFactory {
//  public static createSlurReader(x: any): any;
//}
//
//class MetronomeReader {
//  public static addMetronomeSettings(xmlNode: IXmlElement, musicSheet: MusicSheet): void { }
//  public static readMetronomeInstructions(xmlNode: IXmlElement, musicSheet: MusicSheet, currentXmlMeasureIndex: number): void { }
//  public static readTempoInstruction(soundNode: IXmlElement, musicSheet: MusicSheet, currentXmlMeasureIndex: number): void { }
//}


/**
 * An InstrumentReader is used during the reading phase to keep parsing new measures from the MusicXML file
 * with the readNextXmlMeasure method.
 */
export class InstrumentReader {

  constructor(pluginManager: ReaderPluginManager, repetitionInstructionReader: RepetitionInstructionReader,
    xmlMeasureList: IXmlElement[], instrument: Instrument) {
      this.repetitionInstructionReader = repetitionInstructionReader;
      this.xmlMeasureList = xmlMeasureList;
      this.musicSheet = instrument.GetMusicSheet;
      this.instrument = instrument;
      this.activeClefs = new Array(instrument.Staves.length);
      this.activeClefsHaveBeenInitialized = new Array(instrument.Staves.length);
      for (let i: number = 0; i < instrument.Staves.length; i++) {
        this.activeClefsHaveBeenInitialized[i] = false;
      }
      this.createExpressionGenerators(instrument.Staves.length);
      this.slurReader = new SlurReader(this.musicSheet);
      this.pluginManager = pluginManager;
  }

  private repetitionInstructionReader: RepetitionInstructionReader;
  private xmlMeasureList: IXmlElement[];
  private musicSheet: MusicSheet;
  private slurReader: SlurReader;
  public pluginManager: ReaderPluginManager;
  private instrument: Instrument;
  private voiceGeneratorsDict: { [n: number]: VoiceGenerator } = {};
  private staffMainVoiceGeneratorDict: { [staffId: number]: VoiceGenerator } = {};
  private inSourceMeasureInstrumentIndex: number;
  private divisions: number = 0;
  private currentMeasure: SourceMeasure;
  private previousMeasure: SourceMeasure;
  private currentClefNumber: number = 1;
  private currentXmlMeasureIndex: number = 0;
  private currentStaff: Staff;
  private currentStaffEntry: SourceStaffEntry;
  private activeClefs: ClefInstruction[];
  private activeKey: KeyInstruction;
  private activeRhythm: RhythmInstruction;
  private activeClefsHaveBeenInitialized: boolean[];
  private activeKeyHasBeenInitialized: boolean = false;
  private abstractInstructions: [number, AbstractNotationInstruction, Fraction][] = [];
  //TODO: remove line below if it is not needed anymore?
  //private openChordSymbolContainers: ChordSymbolContainer[] = [];
  private expressionReaders: ExpressionReader[];
  private currentVoiceGenerator: VoiceGenerator;
  //private openSlurDict: { [n: number]: Slur; } = {};
  private maxTieNoteFraction: Fraction;
  private currentMultirestStartMeasure: SourceMeasure;
  private followingMultirestMeasures: number;

  public get ActiveKey(): KeyInstruction {
    return this.activeKey;
  }

  public get MaxTieNoteFraction(): Fraction {
    return this.maxTieNoteFraction;
  }

  public get ActiveRhythm(): RhythmInstruction {
    return this.activeRhythm;
  }

  public set ActiveRhythm(value: RhythmInstruction) {
    this.activeRhythm = value;
  }

  /**
   * Main CreateSheet: read the next XML Measure and save all data to the given [[SourceMeasure]].
   * @param currentMeasure
   * @param measureStartAbsoluteTimestamp - Using this instead of currentMeasure.AbsoluteTimestamp as it isn't set yet
   * @param octavePlusOne Software like Guitar Pro gives one octave too low, so we need to add one
   * @returns {boolean}
   */
  public readNextXmlMeasure(currentMeasure: SourceMeasure, measureStartAbsoluteTimestamp: Fraction, octavePlusOne: boolean): boolean {
    if (this.currentXmlMeasureIndex >= this.xmlMeasureList.length) {
      return false;
    }
    this.currentMeasure = currentMeasure;
    this.followingMultirestMeasures = Math.max(this.followingMultirestMeasures - 1, 0);
    this.inSourceMeasureInstrumentIndex = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument);
    if (this.repetitionInstructionReader) {
     this.repetitionInstructionReader.prepareReadingMeasure(currentMeasure, this.currentXmlMeasureIndex);
    }
    let currentFraction: Fraction = new Fraction(0, 1);
    let previousFraction: Fraction = new Fraction(0, 1);
    let divisionsException: boolean = false;
    this.maxTieNoteFraction = new Fraction(0, 1);
    let lastNoteWasGrace: boolean = false;
    try {
      const measureNode: IXmlElement = this.xmlMeasureList[this.currentXmlMeasureIndex];
      const xmlMeasureListArr: IXmlElement[] = measureNode.elements();
      let measureNumberXml: number;
      if (currentMeasure.Rules.UseXMLMeasureNumbers && !Number.isInteger(currentMeasure.MeasureNumberXML)) {
        measureNumberXml = parseInt(measureNode.attribute("number")?.value, 10);
        if (Number.isInteger(measureNumberXml)) {
            currentMeasure.MeasureNumberXML = measureNumberXml;
        }
      }
      const widthFactorAttr: IXmlAttribute = measureNode.attribute("osmdWidthFactor"); // custom xml attribute
      if (widthFactorAttr) {
        const widthFactorValue: number = Number.parseFloat(widthFactorAttr.value);
        if (typeof widthFactorValue === "number" && !isNaN(widthFactorValue)) {
          currentMeasure.WidthFactor = widthFactorValue;
        } else {
          log.info(`xml parse: osmdWidthFactor invalid for measure ${measureNumberXml}`);
        }
      }
      let previousNode: IXmlElement; // needs a null check when accessed because of node index 0!
      for (let xmlNodeIndex: number = 0; xmlNodeIndex < xmlMeasureListArr.length; xmlNodeIndex++) {
        const xmlNode: IXmlElement = xmlMeasureListArr[xmlNodeIndex];
        if (xmlNodeIndex > 0) {
          previousNode = xmlMeasureListArr[xmlNodeIndex - 1];
        }
        if (xmlNode.name === "print") {
          const newSystemAttr: IXmlAttribute = xmlNode.attribute("new-system");
          if (newSystemAttr?.value === "yes") {
            currentMeasure.printNewSystemXml = true;
          }
          const newPageAttr: IXmlAttribute = xmlNode.attribute("new-page");
          if (newPageAttr?.value === "yes") {
            currentMeasure.printNewPageXml = true;
          }
        } else if (xmlNode.name === "attributes") {
          const divisionsNode: IXmlElement = xmlNode.element("divisions");
          if (divisionsNode) {
            this.divisions = parseInt(divisionsNode.value, 10);
            if (isNaN(this.divisions)) {
              const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError",
                  "Invalid divisions value at Instrument: ");
              log.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
              this.divisions = this.readDivisionsFromNotes();
              if (this.divisions > 0) {
                this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
              } else {
                divisionsException = true;
                throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
              }
            }
          }
          if (
              !xmlNode.element("divisions") &&
              this.divisions === 0 &&
              this.currentXmlMeasureIndex === 0
          ) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
            this.divisions = this.readDivisionsFromNotes();
            if (this.divisions > 0) {
              this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
            } else {
              divisionsException = true;
              throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
            }
          }
          this.addAbstractInstruction(xmlNode, octavePlusOne, previousNode, currentFraction.clone());
          if (currentFraction.Equals(new Fraction(0, 1)) &&
              this.isAttributesNodeAtBeginOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
            this.saveAbstractInstructionList(this.instrument.Staves.length, true);
          }
          if (this.isAttributesNodeAtEndOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode, currentFraction)) {
            this.saveClefInstructionAtEndOfMeasure();
          }
          const staffDetailsNodes: IXmlElement[] = xmlNode.elements("staff-details"); // there can be multiple, even if redundant. see #1041
          for (const staffDetailsNode of staffDetailsNodes) {
            const staffLinesNode: IXmlElement = staffDetailsNode.element("staff-lines");
            if (staffLinesNode) {
              let staffNumber: number = 1;
              const staffNumberAttr: Attr = staffDetailsNode.attribute("number");
              if (staffNumberAttr) {
                staffNumber = parseInt(staffNumberAttr.value, 10);
              }
              this.instrument.Staves[staffNumber - 1].StafflineCount = parseInt(staffLinesNode.value, 10);
            }
          }
          // check multi measure rest
          const measureStyle: IXmlElement = xmlNode.element("measure-style");
          if (measureStyle) {
            const multipleRest: IXmlElement = measureStyle.element("multiple-rest");
            if (multipleRest) {
              // TODO: save multirest per staff info a dictionary, to display a partial multirest if multirest values across staffs differ.
              //   this makes the code bulkier though, and for now we only draw multirests if the staffs have the same multirest lengths.
              // if (!currentMeasure.multipleRestMeasuresPerStaff) {
              //   currentMeasure.multipleRestMeasuresPerStaff = new Dictionary<number, number>();
              // }
              const multipleRestValueXml: string = multipleRest.value;
              let multipleRestNumber: number = 0;
              try {
                multipleRestNumber = Number.parseInt(multipleRestValueXml, 10);
                if (currentMeasure.multipleRestMeasures !== undefined && multipleRestNumber !== currentMeasure.multipleRestMeasures) {
                  // different multi-rest values in same measure for different staffs
                  currentMeasure.multipleRestMeasures = 0; // for now, ignore multirest here. TODO: take minimum
                  // currentMeasure.multipleRestMeasuresPerStaff.setValue(this.currentStaff?.Id, multipleRestNumber);
                  //   issue: currentStaff can be undefined for first measure
                } else {
                  currentMeasure.multipleRestMeasures = multipleRestNumber;
                  this.currentMultirestStartMeasure = currentMeasure;
                  this.followingMultirestMeasures = multipleRestNumber + 1; // will be decremented at the start of the loop
                }
              } catch (e) {
                console.log("multirest parse error: " + e);
              }
            }
          }
        } else if (xmlNode.name === "note") {
          let printObject: boolean = true;
          if (xmlNode.attribute("print-object")?.value === "no") {
              printObject = false; // note will not be rendered, but still parsed for Playback etc.
              // if (xmlNode.attribute("print-spacing")) {
              //   if (xmlNode.attribute("print-spacing").value === "yes" {
              //     // TODO give spacing for invisible notes even when not displayed. might be hard with Vexflow formatting
          }
          const noteStaff: number = this.getNoteStaff(xmlNode);

          this.currentStaff = this.instrument.Staves[noteStaff - 1];
          const isChord: boolean = xmlNode.element("chord") !== undefined;
          if (xmlNode.element("voice")) {
            const noteVoice: number = parseInt(xmlNode.element("voice").value, 10);
            this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(noteVoice, noteStaff - 1);
          } else {
            if (!isChord || !this.currentVoiceGenerator) {
              this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(1, noteStaff - 1);
            }
          }
          let noteDivisions: number = 0;
          let noteDuration: Fraction = new Fraction(0, 1);
          let normalNotes: number = 2;
          let typeDuration: Fraction = undefined;
          const restNote: boolean = xmlNode.element("rest") !== undefined;
          // let isTuplet: boolean = false; // unused now
          if (xmlNode.element("duration")) {
            noteDivisions = parseInt(xmlNode.element("duration").value, 10);
            if (!isNaN(noteDivisions)) {
              noteDuration = new Fraction(noteDivisions, 4 * this.divisions);
              if (restNote && noteDuration.RealValue > this.ActiveRhythm?.Rhythm.RealValue) {
                // bug in Virtual Sheet Music Playground and potentially other exporters
                //   that assigns 4 quarters (whole note) duration to full measure rest in 2/4 measures
                // note that this.ActiveRhythm can be undefined in some test samples
                noteDuration = this.ActiveRhythm.Rhythm.clone();
              }
              if (noteDivisions === 0) {
                noteDuration = this.getNoteDurationFromTypeNode(xmlNode);
              } else {
                typeDuration = this.getNoteDurationFromTypeNode(xmlNode);
              }
              if (xmlNode.element("time-modification")) {
                noteDuration = this.getNoteDurationForTuplet(xmlNode);
                const time: IXmlElement = xmlNode.element("time-modification");
                if (time?.element("normal-notes")) {
                  normalNotes = parseInt(time.element("normal-notes").value, 10);
                }
                // isTuplet = true;
              }
            } else {
              const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid Note Duration.");
              this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
              log.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
              continue;
            }
          }

          //log.info("New note found!", noteDivisions, noteDuration.toString(), restNote);

          const notationsNode: IXmlElement = xmlNode.combinedElement("notations"); // select all notation nodes

          const isGraceNote: boolean = xmlNode.element("grace") !== undefined || noteDivisions === 0 || isChord && lastNoteWasGrace;
          let graceNoteSlash: boolean = false;
          let graceSlur: boolean = false;
          if (isGraceNote) {
            const graceNode: IXmlElement = xmlNode.element("grace");
            if (graceNode && graceNode.attributes()) {
              if (graceNode.attribute("slash")) {
                const slash: string = graceNode.attribute("slash").value;
                if (slash === "yes") {
                  graceNoteSlash = true;
                }
              }
            }

            noteDuration = this.getNoteDurationFromTypeNode(xmlNode);

            if (notationsNode && notationsNode.element("slur")) {
              graceSlur = true;
              // grace slurs could be non-binary, but VexFlow.GraceNoteGroup modifier system is currently only boolean for slurs.
            }
          }

          // check for cue note
          const [isCueNote, noteTypeXml] = this.getCueNoteAndNoteTypeXml(xmlNode);

          // check stem element
          const [stemDirectionXml, stemColorXml, noteheadColorXml] = this.getStemDirectionAndColors(xmlNode);

          // check Tremolo, Vibrato
          let vibratoStrokes: boolean = false;
          let tremoloInfo: TremoloInfo;
          if (notationsNode) {
            const ornamentsNode: IXmlElement = notationsNode.element("ornaments");
            if (ornamentsNode) {
              tremoloInfo = this.getTremoloInfo(ornamentsNode);
              vibratoStrokes = this.getVibratoStrokes(ornamentsNode);
            }
          }

          const musicTimestamp: Fraction = isChord ? previousFraction.clone() : currentFraction.clone();
          this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(
            musicTimestamp,
            this.inSourceMeasureInstrumentIndex + noteStaff - 1,
            this.currentStaff
          ).staffEntry;
          //log.info("currentStaffEntry", this.currentStaffEntry, this.currentMeasure.VerticalSourceStaffEntryContainers.length);

          if (!this.currentVoiceGenerator.hasVoiceEntry()
            || (!isChord && !isGraceNote && !lastNoteWasGrace)
            || (isGraceNote && !lastNoteWasGrace)
            || (isGraceNote && !isChord)
            || (!isGraceNote && lastNoteWasGrace)
          ) {
            this.currentVoiceGenerator.createVoiceEntry(musicTimestamp, this.currentStaffEntry, !restNote && !isGraceNote,
                                                        isGraceNote, graceNoteSlash, graceSlur);
          }
          if (!isGraceNote && !isChord) {
            previousFraction = currentFraction.clone();
            currentFraction.Add(noteDuration);
          }
          if (
            isChord &&
            this.currentStaffEntry !== undefined &&
            this.currentStaffEntry.ParentStaff !== this.currentStaff
          ) {
            this.currentStaffEntry = this.currentVoiceGenerator.checkForStaffEntryLink(
              this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff, this.currentStaffEntry, this.currentMeasure
            );
          }
          const beginOfMeasure: boolean = (
            this.currentStaffEntry !== undefined &&
            this.currentStaffEntry.Timestamp !== undefined &&
            this.currentStaffEntry.Timestamp.Equals(new Fraction(0, 1)) && !this.currentStaffEntry.hasNotes()
          );
          this.saveAbstractInstructionList(this.instrument.Staves.length, beginOfMeasure);
          // this if block handles harmony/chords on the next note/staffentry element, so it assumes that a
          //   harmony is given before the staff entry, but when a harmony is given after a staff entry element with a backup node,
          //   it is put on the next note/staffentry and the last chord item is never parsed at all.
          //   see PR #1342
          // if (this.openChordSymbolContainers.length !== 0) {
          //   this.currentStaffEntry.ChordContainers = this.openChordSymbolContainers;
          //   // TODO handle multiple chords on one note/staffentry
          //   this.openChordSymbolContainers = [];
          // }
          if (this.activeRhythm) {
            // (*) this.musicSheet.SheetPlaybackSetting.Rhythm = this.activeRhythm.Rhythm;
          }
          const dots: number = xmlNode.elements("dot").length;
          this.currentVoiceGenerator.read(
            xmlNode, noteDuration, typeDuration, noteTypeXml, normalNotes, restNote,
            this.currentStaffEntry, this.currentMeasure,
            measureStartAbsoluteTimestamp,
            this.maxTieNoteFraction, isChord, octavePlusOne,
            printObject, isCueNote, isGraceNote, stemDirectionXml, tremoloInfo, stemColorXml, noteheadColorXml,
            vibratoStrokes, dots
          );

          // notationsNode created further up for multiple checks
          if (notationsNode !== undefined && notationsNode.element("dynamics")) {
            const expressionReader: ExpressionReader = this.expressionReaders[this.readExpressionStaffNumber(xmlNode) - 1];
            if (expressionReader) {
             expressionReader.readExpressionParameters(
               xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false
             );
             expressionReader.read(
               xmlNode, this.currentMeasure, previousFraction
             );
            }
          }
          lastNoteWasGrace = isGraceNote;
        } else if (xmlNode.name === "forward") {
          const forFraction: number = parseInt(xmlNode.element("duration").value, 10);
          currentFraction.Add(new Fraction(forFraction, 4 * this.divisions));
        } else if (xmlNode.name === "backup") {
          const backFraction: number = parseInt(xmlNode.element("duration").value, 10);
          currentFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (currentFraction.IsNegative()) {
            currentFraction = new Fraction(0, 1);
          }
          previousFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (previousFraction.IsNegative()) {
            previousFraction = new Fraction(0, 1);
          }
        } else if (xmlNode.name === "direction") {
          const directionTypeNode: IXmlElement = xmlNode.element("direction-type");
          // (*) MetronomeReader.readMetronomeInstructions(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
          let relativePositionInMeasure: number = Math.min(1, currentFraction.RealValue);
          if (this.activeRhythm !== undefined && this.activeRhythm.Rhythm) {
            relativePositionInMeasure /= this.activeRhythm.Rhythm.RealValue;
          }
          let handeled: boolean = false;
          if (this.repetitionInstructionReader) {
            handeled = this.repetitionInstructionReader.handleRepetitionInstructionsFromWordsOrSymbols( directionTypeNode,
                                                                                                        relativePositionInMeasure);
          }
          if (!handeled) {
           let expressionReader: ExpressionReader = this.expressionReaders[0];
           const staffIndex: number = this.readExpressionStaffNumber(xmlNode) - 1;
           if (staffIndex < this.expressionReaders.length) {
             expressionReader = this.expressionReaders[staffIndex];
           }
           if (expressionReader) {
             if (directionTypeNode.element("octave-shift")) {
               expressionReader.readExpressionParameters(
                 xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, true
               );
               expressionReader.addOctaveShift(xmlNode, this.currentMeasure, previousFraction.clone());
             }
             if (directionTypeNode.element("pedal")) {
              expressionReader.readExpressionParameters(
                xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, true
              );
              expressionReader.addPedalMarking(xmlNode, this.currentMeasure, currentFraction.clone());
              // pedal end in OSMD and Vexflow means end BEFORE timestamp, so currentFraction instead of previousFraction needs to be used.
             }
             expressionReader.readExpressionParameters(
               xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false
             );
             expressionReader.read(xmlNode, this.currentMeasure, currentFraction, previousFraction.clone());
           }
          }
        } else if (xmlNode.name === "barline") {
          if (this.repetitionInstructionReader) {
           const measureEndsSystem: boolean = this.repetitionInstructionReader.handleLineRepetitionInstructions(xmlNode);
           if (measureEndsSystem) {
             this.currentMeasure.HasEndLine = true;
           }
          }
          const location: IXmlAttribute = xmlNode.attribute("location");
          const locationValue: string = location?.value ?? "right"; // right is assumed by default in MusicXML spec, see #1522
          const isEndingBarline: boolean = (xmlNodeIndex === xmlMeasureListArr.length - 1);
          if (isEndingBarline || locationValue === "right") {
            const stringValue: string = xmlNode.element("bar-style")?.value;
            // TODO apparently we didn't anticipate bar-style not existing (the ? above was missing). how to handle?
            if (stringValue) {
              this.currentMeasure.endingBarStyleXml = stringValue;
              this.currentMeasure.endingBarStyleEnum = SystemLinesEnumHelper.xmlBarlineStyleToSystemLinesEnum(stringValue);
            }
          }
          // TODO do we need to process bars with left location too?
        } else if (xmlNode.name === "sound") {
          // (*) MetronomeReader.readTempoInstruction(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
          try {
            if (xmlNode.attribute("tempo")) { // can be null, not just undefined!

                const tempo: number = parseFloat(xmlNode.attribute("tempo").value);

                // should set the PlaybackSettings only at first Measure
                if (this.currentXmlMeasureIndex === 0) {
                    this.musicSheet.DefaultStartTempoInBpm = tempo;
                    this.musicSheet.HasBPMInfo = true;
                }
            }
          } catch (e) {
            log.debug("InstrumentReader.readTempoInstruction", e);
          }
        } else if (xmlNode.name === "harmony") {
          const noteStaff: number = this.getNoteStaff(xmlNode);
          this.currentStaff = this.instrument.Staves[noteStaff - 1];
          // new chord, could be second chord on same staffentry/note
          const musicTimestamp: Fraction = currentFraction.clone();
          this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(
              musicTimestamp, this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff).staffEntry;
          this.currentStaffEntry.ChordContainers.push(ChordSymbolReader.readChordSymbol(xmlNode, this.musicSheet, this.activeKey));
        }
      }
      for (const j in this.voiceGeneratorsDict) {
        if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
          const voiceGenerator: VoiceGenerator = this.voiceGeneratorsDict[j];
          voiceGenerator.checkForOpenBeam();
        }
      }
      if (this.currentXmlMeasureIndex === this.xmlMeasureList.length - 1) {
        for (let i: number = 0; i < this.instrument.Staves.length; i++) {
          if (!this.activeClefsHaveBeenInitialized[i]) {
            this.createDefaultClefInstruction(this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument) + i);
          }
        }
        if (!this.activeKeyHasBeenInitialized) {
          this.createDefaultKeyInstruction();
        }

        for (let i: number = 0; i < this.expressionReaders.length; i++) {
         const reader: ExpressionReader = this.expressionReaders[i];
         if (reader) {
           reader.closeOpenExpressions(this.currentMeasure, currentFraction);
          }
        }
      }

      // if this is the first measure and no BPM info found, we set it to 120
      // next measures will automatically inherit that value
      if (!this.musicSheet.HasBPMInfo) {
        this.currentMeasure.TempoInBPM = 120;
      } else if (currentMeasure.TempoInBPM === 0 && this.previousMeasure) {
        this.currentMeasure.TempoInBPM = this.previousMeasure.TempoInBPM;
      }
    } catch (e) {
      if (divisionsException) {
        throw new MusicSheetReadingException(e.Message);
      }
      const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MeasureError", "Error while reading Measure.");
      this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
      log.debug("InstrumentReader.readNextXmlMeasure", errorMsg, e);
    }

    this.previousMeasure = this.currentMeasure;
    this.currentXmlMeasureIndex += 1;
    return true;
  }

  private getStemDirectionAndColors(xmlNode: IXmlElement): [StemDirectionType, string, string] {
    let stemDirectionXml: StemDirectionType = StemDirectionType.Undefined;
    let stemColorXml: string;
    const stemNode: IXmlElement = xmlNode.element("stem");
    if (stemNode) {
      stemDirectionXml = this.getStemDirectionType(stemNode);

      const stemColorAttr: Attr = stemNode.attribute("color");
      if (stemColorAttr) { // can be null, maybe also undefined
        stemColorXml = this.parseXmlColor(stemColorAttr.value);
      }
    }

    // check notehead/color
    let noteheadColorXml: string = this.getNoteHeadColorXml(xmlNode);
    const noteColorXml: string = this.getNoteColorXml(xmlNode);

    if (noteColorXml && !noteheadColorXml) {
      noteheadColorXml = noteColorXml;
    }
    if (noteColorXml && !stemColorXml) {
      stemColorXml = noteColorXml;
    }
    return [stemDirectionXml, stemColorXml, noteheadColorXml];
  }

  /** Parse a color in XML format. Can be #ARGB or #RGB format, colors as byte hex values.
   *  @return color in Vexflow format #[A]RGB or undefined for invalid xmlColorString
   */
  public parseXmlColor(xmlColorString: string): string {
    return xmlColorString;
    // previous implementation:
    // if (!xmlColorString) {
    //   return undefined;
    // }

    // if (xmlColorString.length === 7) { // #RGB
    //   return xmlColorString;
    // } else if (xmlColorString.length === 9) { // #ARGB
    //   return "#" + xmlColorString.substr(3); // cut away alpha channel // why?
    // } else {
    //   return undefined; // invalid xml color
    // }
  }

  public doCalculationsAfterDurationHasBeenSet(): void {
    for (const j in this.voiceGeneratorsDict) {
      if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
        this.voiceGeneratorsDict[j].checkOpenTies();
      }
    }
  }

  /**
   * Get or create the passing [[VoiceGenerator]].
   * @param voiceId
   * @param staffId
   * @returns {VoiceGenerator}
   */
  private getOrCreateVoiceGenerator(voiceId: number, staffId: number): VoiceGenerator {
    const staff: Staff = this.instrument.Staves[staffId];
    let voiceGenerator: VoiceGenerator = this.voiceGeneratorsDict[voiceId];
    if (voiceGenerator) {
      if (staff.Voices.indexOf(voiceGenerator.GetVoice) === -1) {
        staff.Voices.push(voiceGenerator.GetVoice);
      }
    } else {
      const mainVoiceGenerator: VoiceGenerator = this.staffMainVoiceGeneratorDict[staffId];
      if (mainVoiceGenerator) {
        voiceGenerator = new VoiceGenerator(this.pluginManager, staff, voiceId, this.slurReader, mainVoiceGenerator.GetVoice);
        staff.Voices.push(voiceGenerator.GetVoice);
        this.voiceGeneratorsDict[voiceId] = voiceGenerator;
      } else {
        voiceGenerator = new VoiceGenerator(this.pluginManager, staff, voiceId, this.slurReader);
        staff.Voices.push(voiceGenerator.GetVoice);
        this.voiceGeneratorsDict[voiceId] = voiceGenerator;
        this.staffMainVoiceGeneratorDict[staffId] = voiceGenerator;
      }
    }
    return voiceGenerator;
  }


  private createExpressionGenerators(numberOfStaves: number): void {
     this.expressionReaders = new Array(numberOfStaves);
     for (let i: number = 0; i < numberOfStaves; i++) {
      this.expressionReaders[i] = new ExpressionReader(this.musicSheet, this.instrument, i + 1);
     }
  }

  /**
   * Create the default [[ClefInstruction]] for the given staff index.
   * @param staffIndex
   */
  private createDefaultClefInstruction(staffIndex: number): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.length > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    const clefInstruction: ClefInstruction = new ClefInstruction(ClefEnum.G, 0, 2);
    let firstStaffEntry: SourceStaffEntry;
    if (!first.FirstInstructionsStaffEntries[staffIndex]) {
      firstStaffEntry = new SourceStaffEntry(undefined, undefined);
      first.FirstInstructionsStaffEntries[staffIndex] = firstStaffEntry;
    } else {
      firstStaffEntry = first.FirstInstructionsStaffEntries[staffIndex];
      firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
    }
    clefInstruction.Parent = firstStaffEntry;
    firstStaffEntry.Instructions.splice(0, 0, clefInstruction);
  }

  /**
   * Create the default [[KeyInstruction]] in case no [[KeyInstruction]] is given in the whole [[Instrument]].
   */
  private createDefaultKeyInstruction(): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.length > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    const keyInstruction: KeyInstruction = new KeyInstruction(undefined, 0, KeyEnum.major);
    for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + this.instrument.Staves.length; j++) {
      if (!first.FirstInstructionsStaffEntries[j]) {
        const firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
        first.FirstInstructionsStaffEntries[j] = firstStaffEntry;
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.Instructions.push(keyInstruction);
      } else {
        const firstStaffEntry: SourceStaffEntry = first.FirstInstructionsStaffEntries[j];
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
        if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
          firstStaffEntry.Instructions.splice(1, 0, keyInstruction);
        } else {
          firstStaffEntry.Instructions.splice(0, 0, keyInstruction);
        }
      }
    }
  }

  /**
   * Check if the given attributesNode is at the begin of a XmlMeasure.
   * @param parentNode
   * @param attributesNode
   * @returns {boolean}
   */
  private isAttributesNodeAtBeginOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
    const children: IXmlElement[] = parentNode.elements();
    const attributesNodeIndex: number = children.indexOf(attributesNode); // FIXME | 0
    if (attributesNodeIndex > 0 && children[attributesNodeIndex - 1].name === "backup") {
      return true;
    }
    let firstNoteNodeIndex: number = -1;
    for (let i: number = 0; i < children.length; i++) {
      if (children[i].name === "note") {
        firstNoteNodeIndex = i;
        break;
      }
    }
    return (attributesNodeIndex < firstNoteNodeIndex && firstNoteNodeIndex > 0) || (firstNoteNodeIndex < 0);
  }

  /**
   * Check if the given attributesNode is at the end of a XmlMeasure.
   * @param parentNode
   * @param attributesNode
   * @returns {boolean}
   */
  private isAttributesNodeAtEndOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement, currentFraction: Fraction): boolean {
    if (currentFraction.Equals(this.ActiveRhythm?.Rhythm)) {
      return true;
      // when the MusicXML uses a lot of <backup> nodes (e.g. Sibelius), we sometimes only detect measure end like this, not like below.
      //   because below code assumes the attributes node is the last one in the measure, just by order in the XML,
      //   (at least that there are no note nodes after the attributes node)
      //   but with backup nodes, there can be note nodes after it that are at an earlier timestamp.
    }
    const childs: IXmlElement[] = parentNode.elements().slice(); // slice=arrayCopy
    let attributesNodeIndex: number = 0;
    for (let i: number = 0; i < childs.length; i++) {
      if (childs[i] === attributesNode) {
        attributesNodeIndex = i;
        break;
      }
    }
    let nextNoteNodeIndex: number = 0;
    for (let i: number = attributesNodeIndex; i < childs.length; i++) {
      if (childs[i].name === "note") {
        nextNoteNodeIndex = i;
        break;
      }
    }
    return attributesNodeIndex > nextNoteNodeIndex;
  }

  /**
   * Called only when no noteDuration is given in XML.
   * @param xmlNode
   * @returns {Fraction}
   */
  private getNoteDurationFromTypeNode(xmlNode: IXmlElement): Fraction {
    const typeNode: IXmlElement = xmlNode.element("type");
    if (typeNode) {
      const type: string = typeNode.value;
      return NoteTypeHandler.getNoteDurationFromType(type);
    }
    return new Fraction(0, 4 * this.divisions);
  }

  /**
   * Add (the three basic) Notation Instructions to a list
   * @param attrNode
   * @param guitarPro
   */
  private addAbstractInstruction(attrNode: IXmlElement, guitarPro: boolean, previousNode: IXmlElement, currentFraction: Fraction): void {
    if (attrNode.element("divisions")) {
      if (attrNode.elements().length === 1) {
        return;
      }
    }
    const transposeNode: IXmlElement = attrNode.element("transpose");
    if (transposeNode) {
      const chromaticNode: IXmlElement = transposeNode.element("chromatic");
      if (chromaticNode) {
        this.instrument.PlaybackTranspose = parseInt(chromaticNode.value, 10);
      }
    }
    const clefList: IXmlElement[] = attrNode.elements("clef");
    let errorMsg: string;
    if (clefList.length > 0) {
      for (let idx: number = 0, len: number = clefList.length; idx < len; ++idx) {
        const nodeList: IXmlElement = clefList[idx];
        let clefEnum: ClefEnum = ClefEnum.G;
        let line: number = 2;
        let staffNumber: number = 1;
        let clefOctaveOffset: number = 0;
        const lineNode: IXmlElement = nodeList.element("line");
        if (lineNode) {
          try {
            line = parseInt(lineNode.value, 10);
          } catch (ex) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefLineError",
              "Invalid clef line. Using default."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            line = 2;
            log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
          }

        }
        const signNode: IXmlElement = nodeList.element("sign");
        if (signNode) {
          try {
            clefEnum = ClefEnum[signNode.value];
            if (!ClefInstruction.isSupportedClef(clefEnum)) {
              errorMsg = ITextTranslation.translateText(
                "ReaderErrorMessages/ClefError",
                "Unsupported clef. Using default."
              );
              this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
              clefEnum = ClefEnum.G;
              line = 2;
            }
            if (clefEnum === ClefEnum.TAB) {
              clefOctaveOffset = -1;
            }
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef. Using default."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            clefEnum = ClefEnum.G;
            line = 2;
            log.debug("InstrumentReader.addAbstractInstruction", errorMsg, e);
          }

        }
        const clefOctaveNode: IXmlElement = nodeList.element("clef-octave-change");
        if (clefOctaveNode) {
          try {
            clefOctaveOffset = parseInt(clefOctaveNode.value, 10);
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefOctaveError",
              "Invalid clef octave. Using default."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            clefOctaveOffset = 0;
          }

        }
        if (nodeList.hasAttributes && nodeList.attribute("number")) {
          try {
            staffNumber = parseInt(nodeList.attribute("number").value, 10);
            if (staffNumber > this.currentClefNumber) {
              staffNumber = this.currentClefNumber;
            }
            this.currentClefNumber = staffNumber + 1;
          } catch (err) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef. Using default."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            staffNumber = 1;
            this.currentClefNumber = staffNumber + 1;
          }
        }

        const clefInstruction: ClefInstruction = new ClefInstruction(clefEnum, clefOctaveOffset, line);
        this.abstractInstructions.push([staffNumber, clefInstruction, currentFraction]);
      }
    }
    if (attrNode.element("key") !== undefined && this.instrument.MidiInstrumentId !== MidiInstrument.Percussion) {
      let key: number = 0;
      const keyNode: IXmlElement = attrNode.element("key").element("fifths");
      if (keyNode) {
        try {
          key = parseInt(keyNode.value, 10);
        } catch (ex) {
          errorMsg = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key. Set to default."
          );
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          key = 0;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

      }
      let keyEnum: KeyEnum = KeyEnum.none;
      let modeNode: IXmlElement = attrNode.element("key");
      if (modeNode) {
        modeNode = modeNode.element("mode");
      }
      if (modeNode) {
        try {
          keyEnum = KeyEnum[modeNode.value];
        } catch (ex) {
          errorMsg = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key/mode. Set to default."
          );
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          keyEnum = KeyEnum.major;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }
      }
      const keyInstruction: KeyInstruction = new KeyInstruction(undefined, key, keyEnum);
      this.abstractInstructions.push([1, keyInstruction, currentFraction]);
    }
    if (attrNode.element("time")) {
      const timeNode: IXmlElement = attrNode.element("time");
      let symbolEnum: RhythmSymbolEnum = RhythmSymbolEnum.NONE;
      let timePrintObject: boolean = true;
      if (timeNode !== undefined && timeNode.hasAttributes) {
        const symbolAttribute: IXmlAttribute = timeNode.attribute("symbol");
        if (symbolAttribute) {
          if (symbolAttribute.value === "common") {
            symbolEnum = RhythmSymbolEnum.COMMON;
          } else if (symbolAttribute.value === "cut") {
            symbolEnum = RhythmSymbolEnum.CUT;
          }
        }

        const printObjectAttribute: IXmlAttribute = timeNode.attribute("print-object");
        if (printObjectAttribute) {
          if (printObjectAttribute.value === "no") {
            timePrintObject = false;
          }
        }
      }

      let num: number = 0;
      let denom: number = 0;
      const senzaMisura: boolean = (timeNode && timeNode.element("senza-misura") !== undefined);
      const timeList: IXmlElement[] = attrNode.elements("time");
      const beatsList: IXmlElement[] = [];
      const typeList: IXmlElement[] = [];
      for (let idx: number = 0, len: number = timeList.length; idx < len; ++idx) {
        const xmlNode: IXmlElement = timeList[idx];
        beatsList.push.apply(beatsList, xmlNode.elements("beats"));
        typeList.push.apply(typeList, xmlNode.elements("beat-type"));
      }
      if (!senzaMisura) {
        try {
          if (beatsList !== undefined && beatsList.length > 0 && typeList !== undefined && beatsList.length === typeList.length) {
            const length: number = beatsList.length;
            const fractions: Fraction[] = new Array(length);
            let maxDenom: number = 0;
            for (let i: number = 0; i < length; i++) {
              const s: string = beatsList[i].value;
              let n: number = 0;
              let d: number = 0;
              if (s.indexOf("+") !== -1) {
                const numbers: string[] = s.split("+");
                for (let idx: number = 0, len: number = numbers.length; idx < len; ++idx) {
                  n += parseInt(numbers[idx], 10);
                }
              } else {
                n = parseInt(s, 10);
              }
              d = parseInt(typeList[i].value, 10);
              maxDenom = Math.max(maxDenom, d);
              fractions[i] = new Fraction(n, d, 0, false);
            }
            for (let i: number = 0; i < length; i++) {
              if (fractions[i].Denominator === maxDenom) {
                num += fractions[i].Numerator;
              } else {
                num += (maxDenom / fractions[i].Denominator) * fractions[i].Numerator;
              }
            }
            denom = maxDenom;
          } else {
            num = parseInt(attrNode.element("time").element("beats").value, 10);
            denom = parseInt(attrNode.element("time").element("beat-type").value, 10);
          }
        } catch (ex) {
          errorMsg = ITextTranslation.translateText("ReaderErrorMessages/RhythmError", "Invalid rhythm. Set to default.");
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          num = 4;
          denom = 4;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

        const newRhythmInstruction: RhythmInstruction = new RhythmInstruction(
          new Fraction(num, denom, 0, false), symbolEnum
        );
        newRhythmInstruction.PrintObject = timePrintObject;
        this.abstractInstructions.push([1, newRhythmInstruction, currentFraction]);
      } else {
        this.abstractInstructions.push([1, new RhythmInstruction(new Fraction(4, 4, 0, false), RhythmSymbolEnum.NONE), currentFraction]);
      }
    }
  }

  /**
   * Save the current AbstractInstructions to the corresponding [[StaffEntry]]s.
   * @param numberOfStaves
   * @param beginOfMeasure
   */
  private saveAbstractInstructionList(numberOfStaves: number, beginOfMeasure: boolean): void {
    for (let i: number = this.abstractInstructions.length - 1; i >= 0; i--) {
      const instruction: [number, AbstractNotationInstruction, Fraction] = this.abstractInstructions[i];
      const key: number = instruction[0]; // staffNumber
      const value: AbstractNotationInstruction = instruction[1];
      const instructionTimestamp: Fraction = instruction[2];
      if (value instanceof ClefInstruction) {
        const clefInstruction: ClefInstruction = <ClefInstruction>value;
        if (this.currentXmlMeasureIndex === 0 || (key <= this.activeClefs.length && clefInstruction !== this.activeClefs[key - 1])) {
          if (!beginOfMeasure && this.currentStaffEntry !== undefined && !this.currentStaffEntry.hasNotes() &&
            key - 1 === this.instrument.Staves.indexOf(this.currentStaffEntry.ParentStaff)) {
            const newClefInstruction: ClefInstruction = clefInstruction;
            const staffEntry: SourceStaffEntry = this.currentStaffEntry;
            // the instructionTimestamp may differ from the current staffentry's when backup/forward tags are used in the XML.
            //   in this case, we need to skip placing it at the current entry, and save it for later.
            if (instructionTimestamp && Math.abs(instructionTimestamp.RealValue - staffEntry.Timestamp.RealValue) > 0.01) {
              continue; // this instruction should be at a different staffentry/timestamp.
            }
            newClefInstruction.Parent = staffEntry;
            staffEntry.removeFirstInstructionOfTypeClefInstruction();
            staffEntry.Instructions.push(newClefInstruction);
            this.activeClefs[key - 1] = clefInstruction;
            this.abstractInstructions.splice(i, 1);
          } else if (beginOfMeasure) {
            if (instructionTimestamp.RealValue !== 0) {
              continue;
            }
            let firstStaffEntry: SourceStaffEntry;
            if (this.currentMeasure) {
              const newClefInstruction: ClefInstruction = clefInstruction;
              const sseIndex: number = this.inSourceMeasureInstrumentIndex + key - 1;
              const firstSse: SourceStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[sseIndex];
              if (this.currentXmlMeasureIndex === 0) {
                if (!firstSse) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.FirstInstructionsStaffEntries[sseIndex] = firstStaffEntry;
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.Instructions.push(newClefInstruction);
                  this.activeClefsHaveBeenInitialized[key - 1] = true;
                } else if (this.currentMeasure.FirstInstructionsStaffEntries[sseIndex]
                  !==
                  undefined && !(firstSse.Instructions[0] instanceof ClefInstruction)) {
                  firstStaffEntry = firstSse;
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                  firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                  this.activeClefsHaveBeenInitialized[key - 1] = true;
                } else {
                  const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                  newClefInstruction.Parent = lastStaffEntry;
                  lastStaffEntry.Instructions.push(newClefInstruction);
                }
              } else if (!this.activeClefsHaveBeenInitialized[key - 1]) {
                const first: SourceMeasure = this.musicSheet.SourceMeasures[0];
                if (!first.FirstInstructionsStaffEntries[sseIndex]) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                } else {
                  firstStaffEntry = first.FirstInstructionsStaffEntries[sseIndex];
                  firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                }
                newClefInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                this.activeClefsHaveBeenInitialized[key - 1] = true;
              } else {
                let previousPrintedMeasure: SourceMeasure = this.previousMeasure;
                if (this.followingMultirestMeasures > 0 && this.currentMeasure.Rules.RenderMultipleRestMeasures) {
                  previousPrintedMeasure = this.currentMultirestStartMeasure;
                  // TODO check if we can do the same for autogenerated multirest measures
                }
                const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                previousPrintedMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                newClefInstruction.Parent = lastStaffEntry;
                lastStaffEntry.Instructions.push(newClefInstruction);
              }
              this.activeClefs[key - 1] = clefInstruction;
              this.abstractInstructions.splice(i, 1);
            }
          } else {
            let lastStaffEntryBefore: SourceStaffEntry;
            const duration: Fraction = this.activeRhythm.Rhythm;
            if (duration.RealValue > 0 &&
              instructionTimestamp.RealValue / duration.RealValue > 0.90 && // necessary for #1120
              duration.RealValue !== instructionTimestamp.RealValue // necessary for #1461
            ) {
              if (!this.currentMeasure.LastInstructionsStaffEntries[key - 1]) {
                this.currentMeasure.LastInstructionsStaffEntries[key - 1] = new SourceStaffEntry(undefined, this.instrument.Staves[key - 1]);
              }
              lastStaffEntryBefore = this.currentMeasure.LastInstructionsStaffEntries[key - 1];
            }
            // TODO figure out a more elegant way to do this. (see #1120)
            //   the problem is that not all the staffentries in the measure exist yet,
            //   so we can't put the clefInstruction before the correct note.
            //   (if we try that, it's one note too early -> save instruction for later?)
            //let lastTimestampBefore: Fraction;
            // for (const vssec of this.currentMeasure.VerticalSourceStaffEntryContainers) {
            //   for (const sse of vssec.StaffEntries) {
            //     if (sse?.ParentStaff?.Id !== key) {
            //       continue;
            //     }
            //     // if (!lastTimestampBefore || sse.Timestamp.lte(instructionTimestamp)) {
            //     //   lastTimestampBefore = sse.Timestamp;
            //     //   lastStaffEntryBefore = sse;
            //     // } else {
            //     //   lastStaffEntryBefore = sse;
            //     //   break;
            //     // }
            //     if (sse.Timestamp.gte(instructionTimestamp)) {
            //       lastStaffEntryBefore = sse;
            //       break;
            //     }
            //   }
            // }
            //const sseIndex: number = this.inSourceMeasureInstrumentIndex + staffNumber - 1;
            // if (!lastStaffEntryBefore) {
            //   // this doesn't work for some reason
            //   const newContainer: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(this.currentMeasure, instructionTimestamp, 1);
            //   const newStaffEntry: SourceStaffEntry = new SourceStaffEntry(newContainer, this.instrument.Staves[key - 1]);
            //   newContainer.StaffEntries.push(newStaffEntry);
            //   this.currentMeasure.VerticalSourceStaffEntryContainers.push(newContainer);
            //   lastStaffEntryBefore = newStaffEntry;
            // }
            // if (!lastStaffEntryBefore) {
              //   lastStaffEntryBefore = new SourceStaffEntry(undefined, undefined);
              //   this.currentMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntryBefore;
              // }
            if (lastStaffEntryBefore) {
              clefInstruction.Parent = lastStaffEntryBefore;
              lastStaffEntryBefore.Instructions.push(clefInstruction);
              this.activeClefs[key - 1] = clefInstruction;
              this.abstractInstructions.splice(i, 1);
            } // else clefinstruction might be processed later (e.g. Haydn Concertante measure 314)
          }
        } else if (key <= this.activeClefs.length && clefInstruction === this.activeClefs[key - 1]) {
          this.abstractInstructions.splice(i, 1);
        }
      }
      if (value instanceof KeyInstruction) {
        const keyInstruction: KeyInstruction = <KeyInstruction>value;
        if (!this.activeKey || this.activeKey.Key !== keyInstruction.Key) {
          this.activeKey = keyInstruction;
          this.abstractInstructions.splice(i, 1);
          let sourceMeasure: SourceMeasure;
          if (!this.activeKeyHasBeenInitialized) {
            this.activeKeyHasBeenInitialized = true;
            if (this.currentXmlMeasureIndex > 0) {
              sourceMeasure = this.musicSheet.SourceMeasures[0];
            } else {
              sourceMeasure = this.currentMeasure;
            }
          } else {
            sourceMeasure = this.currentMeasure;
          }
          if (sourceMeasure) {
            for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
              const newKeyInstruction: KeyInstruction = keyInstruction;
              if (!sourceMeasure.FirstInstructionsStaffEntries[j]) {
                const firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                sourceMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.push(newKeyInstruction);
              } else {
                const firstStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[j];
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
                if (firstStaffEntry.Instructions.length === 0) {
                  firstStaffEntry.Instructions.push(newKeyInstruction);
                } else {
                  if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
                    firstStaffEntry.Instructions.splice(1, 0, newKeyInstruction);
                  } else {
                    firstStaffEntry.Instructions.splice(0, 0, newKeyInstruction);
                  }
                }
              }
            }
          }
        } else {
          this.abstractInstructions.splice(i, 1);
        }
      }
      if (value instanceof RhythmInstruction) {
        const rhythmInstruction: RhythmInstruction = <RhythmInstruction>value;
        if (!this.activeRhythm || this.activeRhythm !== rhythmInstruction) {
          this.activeRhythm = rhythmInstruction;
          this.abstractInstructions.splice(i, 1);
          if (this.currentMeasure) {
            for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
              const newRhythmInstruction: RhythmInstruction = rhythmInstruction;
              let firstStaffEntry: SourceStaffEntry;
              if (!this.currentMeasure.FirstInstructionsStaffEntries[j]) {
                firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                this.currentMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
              } else {
                firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[j];
                firstStaffEntry.removeFirstInstructionOfTypeRhythmInstruction();
              }
              newRhythmInstruction.Parent = firstStaffEntry;
              firstStaffEntry.Instructions.push(newRhythmInstruction);
            }
          }
        } else {
          this.abstractInstructions.splice(i, 1);
        }
      }
    }
  }

  /**
   * Save any ClefInstruction given - exceptionally - at the end of the currentMeasure.
   */
  private saveClefInstructionAtEndOfMeasure(): void {
    for (let i: number = this.abstractInstructions.length - 1; i >= 0; i--) {
      const key: number = this.abstractInstructions[i][0];
      const value: AbstractNotationInstruction = this.abstractInstructions[i][1];
      if (value instanceof ClefInstruction) {
        const clefInstruction: ClefInstruction = <ClefInstruction>value;
        if (
          (!this.activeClefs[key - 1]) ||
          (clefInstruction.ClefType !== this.activeClefs[key - 1].ClefType || (
            clefInstruction.ClefType === this.activeClefs[key - 1].ClefType &&
            clefInstruction.Line !== this.activeClefs[key - 1].Line
          ))) {
          const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
          this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + key - 1] = lastStaffEntry;
          const newClefInstruction: ClefInstruction = clefInstruction;
          newClefInstruction.Parent = lastStaffEntry;
          lastStaffEntry.Instructions.push(newClefInstruction);
          this.activeClefs[key - 1] = clefInstruction;
          this.abstractInstructions.splice(i, 1);
        }
      }
    }
  }

  /**
   * In case of a [[Tuplet]], read NoteDuration from type.
   * @param xmlNode
   * @returns {Fraction}
   */
  private getNoteDurationForTuplet(xmlNode: IXmlElement): Fraction {
    const durationNode: IXmlElement = xmlNode.element("duration");
    const durationValue: number = Number.parseInt(durationNode.value, 10);
    return new Fraction(durationValue, this.divisions * 4);
    // old method: calculate duration from type, tuplet normal notes etc. this was way more complex and inaccurate
    // let duration: Fraction = new Fraction(0, 1);
    // const typeDuration: Fraction = this.getNoteDurationFromTypeNode(xmlNode);
    // // ^ TODO we need to respect dots for typeDuration. This is much more complicated than just taking duration from XML.
    // if (xmlNode.element("time-modification")) {
    //   const time: IXmlElement = xmlNode.element("time-modification");
    //   if (time) {
    //     if (time.element("actual-notes") !== undefined && time.element("normal-notes")) {
    //       const actualNotes: IXmlElement = time.element("actual-notes");
    //       const normalNotes: IXmlElement = time.element("normal-notes");
    //       const normalDot: boolean = time.element("normal-dot") ? true : false;
    //       if (actualNotes !== undefined && normalNotes) {
    //         const actual: number = parseInt(actualNotes.value, 10);
    //         let normal: number = parseInt(normalNotes.value, 10);
    //         if (normalDot) {
    //           normal *= 1.5;
    //         }
    //         duration = new Fraction(normal * typeDuration.Numerator + typeDuration.WholeValue, actual * typeDuration.Denominator);
    //       }
    //     }
    //   }
    // }
    // return duration;
  }

  private readExpressionStaffNumber(xmlNode: IXmlElement): number {
   let directionStaffNumber: number = 1;
   if (xmlNode.element("staff")) {
     const staffNode: IXmlElement = xmlNode.element("staff");
     if (staffNode) {
       try {
         directionStaffNumber = parseInt(staffNode.value, 10);
       } catch (ex) {
         const errorMsg: string = ITextTranslation.translateText(
           "ReaderErrorMessages/ExpressionStaffError", "Invalid Expression staff number. Set to default."
         );
         this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
         directionStaffNumber = 1;
         log.debug("InstrumentReader.readExpressionStaffNumber", errorMsg, ex);
       }

     }
   }
   return directionStaffNumber;
  }

  /**
   * Calculate the divisions value from the type and duration of the first MeasureNote that makes sense
   * (meaning itself hasn't any errors and it doesn't belong to a [[Tuplet]]).
   *
   * If all the MeasureNotes belong to a [[Tuplet]], then we read the next XmlMeasure (and so on...).
   * If we have reached the end of the [[Instrument]] and still the divisions aren't set, we throw an exception
   * @returns {number}
   */
  private readDivisionsFromNotes(): number {
    let divisionsFromNote: number = 0;
    let xmlMeasureIndex: number = this.currentXmlMeasureIndex;
    let read: boolean = false;
    while (!read) {
      const xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[xmlMeasureIndex].elements();
      for (let idx: number = 0, len: number = xmlMeasureListArr.length; idx < len; ++idx) {
        const xmlNode: IXmlElement = xmlMeasureListArr[idx];
        if (xmlNode.name === "note" && !xmlNode.element("time-modification")) {
          const durationNode: IXmlElement = xmlNode.element("duration");
          const typeNode: IXmlElement = xmlNode.element("type");
          if (durationNode !== undefined && typeNode) {
            const type: string = typeNode.value;
            let noteDuration: number = 0;
            try {
              noteDuration = parseInt(durationNode.value, 10);
            } catch (ex) {
              log.debug("InstrumentReader.readDivisionsFromNotes", ex);
              continue;
            }

            switch (type) {
              case "1024th":
                divisionsFromNote = (noteDuration / 4) * 1024;
                break;
              case "512th":
                divisionsFromNote = (noteDuration / 4) * 512;
                break;
              case "256th":
                divisionsFromNote = (noteDuration / 4) * 256;
                break;
              case "128th":
                divisionsFromNote = (noteDuration / 4) * 128;
                break;
              case "64th":
                divisionsFromNote = (noteDuration / 4) * 64;
                break;
              case "32nd":
                divisionsFromNote = (noteDuration / 4) * 32;
                break;
              case "16th":
                divisionsFromNote = (noteDuration / 4) * 16;
                break;
              case "eighth":
                divisionsFromNote = (noteDuration / 4) * 8;
                break;
              case "quarter":
                divisionsFromNote = (noteDuration / 4) * 4;
                break;
              case "half":
                divisionsFromNote = (noteDuration / 4) * 2;
                break;
              case "whole":
                divisionsFromNote = (noteDuration / 4);
                break;
              case "breve":
                divisionsFromNote = (noteDuration / 4) / 2;
                break;
              case "long":
                divisionsFromNote = (noteDuration / 4) / 4;
                break;
              case "maxima":
                divisionsFromNote = (noteDuration / 4) / 8;
                break;
              default:
                break;
            }
          }
        }
        if (divisionsFromNote > 0) {
          read = true;
          break;
        }
      }
      if (divisionsFromNote === 0) {
        xmlMeasureIndex++;
        if (xmlMeasureIndex === this.xmlMeasureList.length) {
          const errorMsg: string = ITextTranslation.translateText("ReaderErrorMEssages/DivisionsError", "Invalid divisions value at Instrument: ");
          throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
        }
      }
    }
    return divisionsFromNote;
  }

  private getCueNoteAndNoteTypeXml(xmlNode: IXmlElement): [boolean, NoteType] {
    const cueNode: IXmlElement = xmlNode.element("cue");
    let isCueNote: boolean = false;
    if (cueNode) {
      isCueNote = true;
    }

    const typeNode: IXmlElement = xmlNode.element("type");
    let noteTypeXml: NoteType = NoteType.UNDEFINED;
    if (typeNode) {
      const sizeAttr: Attr = typeNode.attribute("size");
      if (sizeAttr?.value === "cue") {
        isCueNote = true;
      }
      noteTypeXml = NoteTypeHandler.StringToNoteType(typeNode.value);
    }
    return [isCueNote, noteTypeXml];
  }

  private getStemDirectionType(stemNode: IXmlElement): StemDirectionType {
    switch (stemNode.value) {
      case "down":
        return StemDirectionType.Down;
      case "up":
        return StemDirectionType.Up;
      case "double":
        return StemDirectionType.Double;
      case "none":
        return StemDirectionType.None;
      default:
        return StemDirectionType.Undefined;
    }
  }

  private getNoteHeadColorXml(xmlNode: IXmlElement): string | null {
    const noteheadNode: IXmlElement = xmlNode.element("notehead");
    if (noteheadNode) {
      const colorAttr: Attr = noteheadNode.attribute("color");
      if (colorAttr) {
        return this.parseXmlColor(colorAttr.value);
      }
    }
    return null;
  }

  private getNoteColorXml(xmlNode: IXmlElement): string | null {
    const noteColorAttr: Attr = xmlNode.attribute("color");
    if (noteColorAttr) { // can be undefined
      return this.parseXmlColor(noteColorAttr.value);
    }
    return null;
  }

  private getTremoloInfo(ornamentsNode: IXmlElement): TremoloInfo {
    let tremoloStrokes: number;
    let tremoloUnmeasured: boolean;
    const tremoloNode: IXmlElement = ornamentsNode.element("tremolo");
    if (tremoloNode) {
      const tremoloType: Attr = tremoloNode.attribute("type");
      if (tremoloType) {
        if (tremoloType.value === "single") {
          const tremoloStrokesGiven: number = parseInt(tremoloNode.value, 10);
          if (tremoloStrokesGiven > 0) {
            tremoloStrokes = tremoloStrokesGiven;
          }
        } else {
          tremoloStrokes = 0;
        }
        if (tremoloType.value === "unmeasured") {
          tremoloUnmeasured = true;
        }
        // TODO implement type "start". Vexflow doesn't have tremolo beams yet though (shorter than normal beams)
      }
    }
    return {
      tremoloStrokes: tremoloStrokes,
      tremoloUnmeasured: tremoloUnmeasured
    };
  }

  private getVibratoStrokes(ornamentsNode: IXmlElement): boolean {
    const vibratoNode: IXmlElement = ornamentsNode.element("wavy-line");
    if (vibratoNode !== undefined) {
      const vibratoType: Attr = vibratoNode.attribute("type");
      if (vibratoType && vibratoType.value === "start") {
        return true;
      }
    }
    return false;
  }

  private getNoteStaff(xmlNode: IXmlElement): number {
    let noteStaff: number = 1;
    if (this.instrument.Staves.length > 1) {
      if (xmlNode.element("staff")) {
        noteStaff = parseInt(xmlNode.element("staff").value, 10);
        if (isNaN(noteStaff)) {
          log.debug("InstrumentReader.readNextXmlMeasure.get staff number");
          noteStaff = 1;
        }
      }
    }
    return noteStaff;
  }
}
