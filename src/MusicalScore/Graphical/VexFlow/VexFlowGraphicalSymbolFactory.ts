import Vex from "vexflow";
import VF = Vex.Flow;
import {IGraphicalSymbolFactory} from "../../Interfaces/IGraphicalSymbolFactory";
import {MusicSystem} from "../MusicSystem";
import {VexFlowMusicSystem} from "./VexFlowMusicSystem";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {GraphicalMeasure} from "../GraphicalMeasure";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowStaffEntry} from "./VexFlowStaffEntry";
import {Note} from "../../VoiceData/Note";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {GraphicalNote} from "../GraphicalNote";
import {Pitch} from "../../../Common/DataObjects/Pitch";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {GraphicalChordSymbolContainer} from "../GraphicalChordSymbolContainer";
import {GraphicalLabel} from "../GraphicalLabel";
import {EngravingRules} from "../EngravingRules";
import { TechnicalInstruction } from "../../VoiceData/Instructions/TechnicalInstruction";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { VexFlowConverter } from "./VexFlowConverter";
import { VexFlowTabMeasure } from "./VexFlowTabMeasure";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { VexFlowMultiRestMeasure } from "./VexFlowMultiRestMeasure";
import { BoundingBox } from "../BoundingBox";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";

export class VexFlowGraphicalSymbolFactory implements IGraphicalSymbolFactory {
    /**
     * Create a new music system for the given page.
     * Currently only one vertically endless page exists where all systems are put to.
     * @param page
     * @param systemIndex
     * @returns {VexFlowMusicSystem}
     */
    public createMusicSystem(systemIndex: number, rules: EngravingRules): MusicSystem {
        return new VexFlowMusicSystem(systemIndex, rules);
    }

    /**
     * Create a staffline object containing all staff measures belonging to a given system and staff.
     * @param parentSystem
     * @param parentStaff
     * @returns {VexFlowStaffLine}
     */
    public createStaffLine(parentSystem: MusicSystem, parentStaff: Staff): StaffLine {
        return new VexFlowStaffLine(parentSystem, parentStaff);
    }

    /**
     * Construct an empty graphicalMeasure from the given source measure and staff.
     * @param sourceMeasure
     * @param staff
     * @returns {VexFlowMeasure}
     */
    public createGraphicalMeasure(sourceMeasure: SourceMeasure, staff: Staff, isTabMeasure: boolean = false): GraphicalMeasure {
        return new VexFlowMeasure(staff, sourceMeasure, undefined);
    }

    /**
     * Construct a MultiRestMeasure from the given source measure and staff.
     * @param sourceMeasure
     * @param staff
     * @returns {VexFlowMultiRestMeasure}
     */
    public createMultiRestMeasure(sourceMeasure: SourceMeasure, staff: Staff, staffLine?: StaffLine): GraphicalMeasure {
        return new VexFlowMultiRestMeasure(staff, sourceMeasure, staffLine);
    }

    /**
     * Construct an empty Tab staffMeasure from the given source measure and staff.
     * @param sourceMeasure
     * @param staff
     * @returns {VexFlowTabMeasure}
     */
    public createTabStaffMeasure(sourceMeasure: SourceMeasure, staff: Staff): GraphicalMeasure {
        return new VexFlowTabMeasure(staff, sourceMeasure);
    }

    /**
     * Create empty measure, which will be used to show key, rhythm changes at the end of the system.
     * @param staffLine
     * @returns {VexFlowMeasure}
     */
    public createExtraGraphicalMeasure(staffLine: StaffLine): GraphicalMeasure {
        const extraGraphicalMeasure: GraphicalMeasure = new VexFlowMeasure(staffLine.ParentStaff, undefined, staffLine);
        extraGraphicalMeasure.IsExtraGraphicalMeasure = true; // this also means that MeasureNumber < 0 because unchanged
        extraGraphicalMeasure.ExtraGraphicalMeasurePreviousMeasure = staffLine.Measures.last();
        return extraGraphicalMeasure;
    }

    /**
     * Create a staffEntry in the given measure for a given sourceStaffEntry.
     * @param sourceStaffEntry
     * @param measure
     * @returns {VexFlowStaffEntry}
     */
    public createStaffEntry(sourceStaffEntry: SourceStaffEntry, measure: GraphicalMeasure): GraphicalStaffEntry {
        return new VexFlowStaffEntry(<VexFlowMeasure>measure, sourceStaffEntry, undefined);
    }

    public createVoiceEntry(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry): GraphicalVoiceEntry {
        return new VexFlowVoiceEntry(parentVoiceEntry, parentStaffEntry);
    }

    /**
     * Create a Graphical Note for given note and clef and as part of graphicalStaffEntry.
     * @param note
     * @param numberOfDots  The number of dots the note has to increase its musical duration.
     * @param graphicalStaffEntry
     * @param activeClef    The currently active clef, needed for positioning the note vertically
     * @param octaveShift   The currently active octave transposition enum, needed for positioning the note vertically
     * @returns {GraphicalNote}
     */
    public createNote(note: Note, graphicalVoiceEntry: GraphicalVoiceEntry, activeClef: ClefInstruction,
        octaveShift: OctaveEnum = OctaveEnum.NONE, rules: EngravingRules,
        graphicalNoteLength: Fraction = undefined): GraphicalNote {
        return new VexFlowGraphicalNote(note, graphicalVoiceEntry, activeClef, octaveShift, rules, graphicalNoteLength);
    }

    /**
     * Create a Graphical Grace Note (smaller head, stem...) for given note and clef and as part of graphicalStaffEntry.
     * @param note
     * @param numberOfDots
     * @param graphicalVoiceEntry
     * @param activeClef
     * @param octaveShift
     * @returns {GraphicalNote}
     */
    public createGraceNote(note: Note, graphicalVoiceEntry: GraphicalVoiceEntry,
                           activeClef: ClefInstruction, rules: EngravingRules,
                           octaveShift: OctaveEnum = OctaveEnum.NONE): GraphicalNote {
        return new VexFlowGraphicalNote(note, graphicalVoiceEntry, activeClef, octaveShift, rules);
    }

    /**
     * Sets a pitch which will be used for rendering the given graphical note (not changing the original pitch of the note!!!).
     * Will be only called if the displayed accidental is different from the original (e.g. a C# with C# as key instruction)
     * @param graphicalNote
     * @param pitch The pitch which will be rendered.
     */
    public addGraphicalAccidental(graphicalNote: GraphicalNote, pitch: Pitch): void {
        const note: VexFlowGraphicalNote = (graphicalNote as VexFlowGraphicalNote);
        // accidental is added in setPitch
        note.setAccidental(pitch);
    }

    /**
     * Adds a Fermata symbol at the last note of the given tied Note.
     * The last graphical note of this tied note is located at the given graphicalStaffEntry.
     * A Fermata has to be located at the last tied note.
     * @param tiedNote
     * @param graphicalStaffEntry
     */
    public addFermataAtTiedEndNote(tiedNote: Note, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }



    /**
     * Adds a clef change within a measure before the given staff entry.
     * @param graphicalStaffEntry
     * @param clefInstruction
     */
    public createInStaffClef(graphicalStaffEntry: GraphicalStaffEntry, clefInstruction: ClefInstruction): void {
        const se: VexFlowStaffEntry = graphicalStaffEntry as VexFlowStaffEntry;
        const vfClefParams: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clefInstruction, "small");
        se.vfClefBefore = new VF.ClefNote(vfClefParams.type, vfClefParams.size, vfClefParams.annotation);
        return;
    }

    /**
     * Adds a chord symbol at the given staff entry
     * @param sourceStaffEntry
     * @param graphicalStaffEntry
     * @param transposeHalftones
     */
    public createChordSymbols(  sourceStaffEntry: SourceStaffEntry,
                                graphicalStaffEntry: GraphicalStaffEntry,
                                keyInstruction: KeyInstruction,
                                transposeHalftones: number): void {
        const rules: EngravingRules = graphicalStaffEntry.parentMeasure.parentSourceMeasure.Rules; // TODO undefined sometimes
        let xShift: number = 0;
        const chordSymbolSpacing: number = rules.ChordSymbolXSpacing;
        for (const chordSymbolContainer of sourceStaffEntry.ChordContainers) {
            if (!chordSymbolContainer) { // undefined
                continue;
            }
            let parentBbox: BoundingBox = graphicalStaffEntry.PositionAndShape;
            if (graphicalStaffEntry.graphicalVoiceEntries.length === 1 &&
                graphicalStaffEntry.graphicalVoiceEntries[0].notes.length === 1 &&
                graphicalStaffEntry.graphicalVoiceEntries[0].notes[0].sourceNote.isWholeRest()) {
                // graphicalStaffEntry.graphicalVoiceEntries[0]?.notes[0]?.sourceNote.IsWholeMeasureRest // not yet set apparently
                // whole measure rests: position at start of measure instead of middle like the rest note
                // xShift -= graphicalStaffEntry.PositionAndShape.RelativePosition.x; // unfortunately relative x is 0 here
                parentBbox = graphicalStaffEntry.parentMeasure.PositionAndShape;
                xShift += graphicalStaffEntry.parentMeasure.beginInstructionsWidth;
                xShift += rules.ChordSymbolWholeMeasureRestXOffset; // margin to start of measure / bar
            }
            const graphicalChordSymbolContainer: GraphicalChordSymbolContainer =
              new GraphicalChordSymbolContainer(chordSymbolContainer,
                                                parentBbox,
                                                rules.ChordSymbolTextHeight,
                                                keyInstruction,
                                                transposeHalftones,
                                                rules
                                                );
            const placement: PlacementEnum = graphicalChordSymbolContainer.GetChordSymbolContainer.Placement;
            const graphicalLabel: GraphicalLabel = graphicalChordSymbolContainer.GraphicalLabel;
            if (placement === PlacementEnum.Below) {
                graphicalLabel.PositionAndShape.RelativePosition.y = rules.StaffHeight + rules.ChordSymbolYOffset;
            } else {
                graphicalLabel.PositionAndShape.RelativePosition.y -= rules.ChordSymbolYOffset;
            }
            graphicalLabel.setLabelPositionAndShapeBorders(); // to get Size.width
            let extraXShiftForShortChordSymbols: number = 0;
            if (graphicalLabel.PositionAndShape.Size.width < rules.ChordSymbolExtraXShiftWidthThreshold) {
                extraXShiftForShortChordSymbols = rules.ChordSymbolExtraXShiftForShortChordSymbols;
            }
            graphicalLabel.PositionAndShape.RelativePosition.x += xShift + extraXShiftForShortChordSymbols;
            graphicalLabel.setLabelPositionAndShapeBorders();
            // TODO check for available space until next staffEntry or chord symbol? (x direction)
            graphicalChordSymbolContainer.PositionAndShape.calculateBoundingBox();
            graphicalStaffEntry.graphicalChordContainers.push(graphicalChordSymbolContainer);

            xShift += graphicalLabel.PositionAndShape.Size.width + chordSymbolSpacing;
        }
    }

    /**
     * Adds a technical instruction at the given staff entry.
     * @param technicalInstruction
     * @param graphicalStaffEntry
     */
    public createGraphicalTechnicalInstruction(technicalInstruction: TechnicalInstruction, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

}
