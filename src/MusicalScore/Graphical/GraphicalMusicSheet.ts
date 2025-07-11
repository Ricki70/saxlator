import {MusicSheet} from "../MusicSheet";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalLine} from "./GraphicalLine";
import {MusicSystem} from "./MusicSystem";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {GraphicalNote} from "./GraphicalNote";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {MusicSheetCalculator} from "./MusicSheetCalculator";
import log from "loglevel";
//import { Dictionary } from "typescript-collections"; // unused for now
import {CollectionUtil} from "../../Util/CollectionUtil";
import {SelectionStartSymbol} from "./SelectionStartSymbol";
import {SelectionEndSymbol} from "./SelectionEndSymbol";
import {OutlineAndFillStyleEnum} from "./DrawingEnums";
import { MusicSheetDrawer } from "./MusicSheetDrawer";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { GraphicalObject } from "./GraphicalObject";
// import { VexFlowMusicSheetDrawer } from "./VexFlow/VexFlowMusicSheetDrawer";
// import { SvgVexFlowBackend } from "./VexFlow/SvgVexFlowBackend"; // causes build problem with npm start

/**
 * The graphical counterpart of a [[MusicSheet]]
 */
export class GraphicalMusicSheet {
    constructor(musicSheet: MusicSheet, calculator: MusicSheetCalculator) {
        this.musicSheet = musicSheet;
        this.numberOfStaves = this.musicSheet.Staves.length;
        this.calculator = calculator;
        this.calculator.initialize(this);
    }

    private musicSheet: MusicSheet;
    //private fontInfo: FontInfo = FontInfo.Info;
    private calculator: MusicSheetCalculator;
    public drawer: MusicSheetDrawer;
    private musicPages: GraphicalMusicPage[] = [];
    /** measures (i,j) where i is the measure number and j the staff index (e.g. staff indices 0, 1 for two piano parts) */
    private measureList: GraphicalMeasure[][] = [];
    private verticalGraphicalStaffEntryContainers: VerticalGraphicalStaffEntryContainer[] = [];
    private title: GraphicalLabel;
    private subtitle: GraphicalLabel;
    private composer: GraphicalLabel;
    private lyricist: GraphicalLabel;
    private copyright: GraphicalLabel;
    private cursors: GraphicalLine[] = [];
    private selectionStartSymbol: SelectionStartSymbol;
    private selectionEndSymbol: SelectionEndSymbol;
    private minAllowedSystemWidth: number;
    //private systemImages: Dictionary<MusicSystem, SystemImageProperties> = new Dictionary<MusicSystem, SystemImageProperties>();
    private numberOfStaves: number;
    private leadSheet: boolean = false;

    public get ParentMusicSheet(): MusicSheet {
        return this.musicSheet;
    }

    public get GetCalculator(): MusicSheetCalculator {
        return this.calculator;
    }

    public get MusicPages(): GraphicalMusicPage[] {
        return this.musicPages;
    }

    public set MusicPages(value: GraphicalMusicPage[]) {
        this.musicPages = value;
    }

    //public get FontInfo(): FontInfo {
    //    return this.fontInfo;
    //}

    public get MeasureList(): GraphicalMeasure[][] {
        return this.measureList;
    }

    public set MeasureList(value: GraphicalMeasure[][]) {
        this.measureList = value;
    }

    public get VerticalGraphicalStaffEntryContainers(): VerticalGraphicalStaffEntryContainer[] {
        return this.verticalGraphicalStaffEntryContainers;
    }

    public set VerticalGraphicalStaffEntryContainers(value: VerticalGraphicalStaffEntryContainer[]) {
        this.verticalGraphicalStaffEntryContainers = value;
    }

    public get Title(): GraphicalLabel {
        return this.title;
    }

    public set Title(value: GraphicalLabel) {
        this.title = value;
    }

    public get Subtitle(): GraphicalLabel {
        return this.subtitle;
    }

    public set Subtitle(value: GraphicalLabel) {
        this.subtitle = value;
    }

    public get Composer(): GraphicalLabel {
        return this.composer;
    }

    public set Composer(value: GraphicalLabel) {
        this.composer = value;
    }

    public get Lyricist(): GraphicalLabel {
        return this.lyricist;
    }

    public set Lyricist(value: GraphicalLabel) {
        this.lyricist = value;
    }

    public get Copyright(): GraphicalLabel {
        return this.copyright;
    }

    public set Copyright(value: GraphicalLabel) {
        this.copyright = value;
    }

    public get Cursors(): GraphicalLine[] {
        return this.cursors;
    }

    public get SelectionStartSymbol(): SelectionStartSymbol {
        return this.selectionStartSymbol;
    }

    public get SelectionEndSymbol(): SelectionEndSymbol {
        return this.selectionEndSymbol;
    }

    public get MinAllowedSystemWidth(): number {
        return this.minAllowedSystemWidth;
    }

    public set MinAllowedSystemWidth(value: number) {
        this.minAllowedSystemWidth = value;
    }

    // public get SystemImages(): Dictionary<MusicSystem, SystemImageProperties> {
    //     return this.systemImages;
    // }

    public get NumberOfStaves(): number {
        return this.numberOfStaves;
    }

    public get LeadSheet(): boolean {
        return this.leadSheet;
    }

    public set LeadSheet(value: boolean) {
        this.leadSheet = value;
    }

    /**
     * Calculate the Absolute Positions from the Relative Positions.
     * @param graphicalMusicSheet
     */
    public static transformRelativeToAbsolutePosition(graphicalMusicSheet: GraphicalMusicSheet): void {
        for (let i: number = 0; i < graphicalMusicSheet.MusicPages.length; i++) {
            const pageAbsolute: PointF2D = graphicalMusicSheet.MusicPages[i].setMusicPageAbsolutePosition(i, graphicalMusicSheet.ParentMusicSheet.Rules);
            const page: GraphicalMusicPage = graphicalMusicSheet.MusicPages[i];
            page.PositionAndShape.calculateAbsolutePositionsRecursive(pageAbsolute.x, pageAbsolute.y);
        }
    }

    public Initialize(): void {
        this.verticalGraphicalStaffEntryContainers = [];
        this.musicPages = [];
        this.measureList = [];
    }

    public reCalculate(): void {
        this.calculator.calculate();
    }

    // unused method
    // public prepare(): void {
    //     this.calculator.prepareGraphicalMusicSheet();
    // }

    public EnforceRedrawOfMusicSystems(): void {
        for (let idx: number = 0, len: number = this.musicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.musicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.needsToBeRedrawn = true;
            }
        }
    }

    public getClickedObject<T>(positionOnMusicSheet: PointF2D): T {
        for (let idx: number = 0, len: number = this.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            return graphicalMusicPage.PositionAndShape.getClickedObjectOfType<T>(positionOnMusicSheet);
        }
        return undefined;
    }

    public findGraphicalMeasure(measureIndex: number, staffIndex: number): GraphicalMeasure {
        // note the cursor calls this with measureIndex 1 (measure 2) when advancing beyond the end of a 1-measure piece
        for (let i: number = measureIndex; i >= 0; i--) {
            const gMeasure: GraphicalMeasure = this.measureList[i]?.[staffIndex];
            if (gMeasure) {
                return gMeasure;
            }
            // else look backwards (previous measures). this is only really valid for MultipleRestMeasures of course.
        }
        return undefined; // shouldn't happen
    }

    public findGraphicalMeasureByMeasureNumber(measureNumber: number, staffIndex: number): GraphicalMeasure {
        // start with index = measureNumber, as a piece with a pickup measure starts with measure number 0
        for (let i: number = measureNumber; i >= 0; i--) {
            if (this.MeasureList[i]) {
                const measure: GraphicalMeasure = this.MeasureList[i][staffIndex];
                if (measure?.MeasureNumber === measureNumber) {
                    return measure;
                }
            }
        }
        return undefined;
    }

    /**
     * Search the MeasureList for a certain GraphicalStaffEntry with the given SourceStaffEntry,
     * at a certain verticalIndex (eg a corresponding Staff), starting at a specific horizontalIndex (eg specific GraphicalMeasure).
     * @param staffIndex
     * @param measureIndex
     * @param sourceStaffEntry
     * @returns {any}
     */
    public findGraphicalStaffEntryFromMeasureList(staffIndex: number, measureIndex: number, sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry {
        for (let i: number = measureIndex; i < this.measureList.length; i++) {
            const graphicalMeasure: GraphicalMeasure = this.measureList[i][staffIndex];
            if (!graphicalMeasure) {
                continue;
            }
            for (let idx: number = 0, len: number = graphicalMeasure.staffEntries.length; idx < len; ++idx) {
                const graphicalStaffEntry: GraphicalStaffEntry = graphicalMeasure.staffEntries[idx];
                if (graphicalStaffEntry.sourceStaffEntry === sourceStaffEntry) {
                    return graphicalStaffEntry;
                }
            }
        }
        return undefined;
    }

    /**
     * Return the next (to the right) not null GraphicalStaffEntry from a given Index.
     * @param staffIndex
     * @param measureIndex
     * @param graphicalStaffEntry
     * @returns {any}
     */
    public findNextGraphicalStaffEntry(staffIndex: number, measureIndex: number, graphicalStaffEntry: GraphicalStaffEntry): GraphicalStaffEntry {
        const graphicalMeasure: GraphicalMeasure = graphicalStaffEntry.parentMeasure;
        const graphicalStaffEntryIndex: number = graphicalMeasure.staffEntries.indexOf(graphicalStaffEntry);
        if (graphicalStaffEntryIndex < graphicalMeasure.staffEntries.length - 1) {
            return graphicalMeasure.staffEntries[graphicalStaffEntryIndex + 1];
        } else if (measureIndex < this.measureList.length - 1) {
            const nextMeasure: GraphicalMeasure = this.measureList[measureIndex + 1][staffIndex];
            if (nextMeasure.staffEntries.length > 0) {
                return nextMeasure.staffEntries[0];
            }
        }
        return undefined;
    }

    public getFirstVisibleMeasuresListFromIndices(start: number, end: number): GraphicalMeasure[] {
        const graphicalMeasures: GraphicalMeasure[] = [];
        const numberOfStaves: number = this.measureList[0].length;
        for (let i: number = start; i <= end; i++) {
            for (let j: number = 0; j < numberOfStaves; j++) {
                if (this.measureList[i][j].isVisible()) {
                    graphicalMeasures.push(this.measureList[i][j]);
                    break;
                }
            }
        }
        return graphicalMeasures;
    }

    public orderMeasuresByStaffLine(measures: GraphicalMeasure[]): GraphicalMeasure[][] {
        const orderedMeasures: GraphicalMeasure[][] = [];
        let mList: GraphicalMeasure[] = [];
        orderedMeasures.push(mList);
        for (let i: number = 0; i < measures.length; i++) {
            if (i === 0) {
                mList.push(measures[0]);
            } else {
                if (measures[i].ParentStaffLine === measures[i - 1].ParentStaffLine) {
                    mList.push(measures[i]);
                } else {
                    if (orderedMeasures.indexOf(mList) === -1) {
                        orderedMeasures.push(mList);
                    }
                    mList = [];
                    orderedMeasures.push(mList);
                    mList.push(measures[i]);
                }
            }
        }
        return orderedMeasures;
    }

    /**
     * Return the active Clefs at the start of the first SourceMeasure.
     * @returns {ClefInstruction[]}
     */
    public initializeActiveClefs(): ClefInstruction[] {
        const activeClefs: ClefInstruction[] = [];
        const firstSourceMeasure: SourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure) {
            for (let i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                let clef: ClefInstruction = new ClefInstruction();
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i]) {
                    for (let idx: number = 0, len: number = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                        const abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                        if (abstractNotationInstruction instanceof ClefInstruction) {
                            clef = <ClefInstruction>abstractNotationInstruction;

                        }
                    }
                }
                activeClefs.push(clef);
            }
        }
        return activeClefs;
    }

    public GetMainKey(): KeyInstruction {
        const firstSourceMeasure: SourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure) {
            for (let i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                for (let idx: number = 0, len: number = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                    const abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                    if (abstractNotationInstruction instanceof KeyInstruction) {
                        return <KeyInstruction>abstractNotationInstruction;
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Create the VerticalContainer and adds it to the List at the correct Timestamp position.
     * @param timestamp
     * @returns {any}
     */
    public getOrCreateVerticalContainer(timestamp: Fraction): VerticalGraphicalStaffEntryContainer {
        if (this.verticalGraphicalStaffEntryContainers.length === 0 ||
            (CollectionUtil.getLastElement(this.verticalGraphicalStaffEntryContainers).AbsoluteTimestamp).lt(timestamp)) {
            const verticalGraphicalStaffEntryContainer: VerticalGraphicalStaffEntryContainer =
                new VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
            this.verticalGraphicalStaffEntryContainers.push(verticalGraphicalStaffEntryContainer);
            return verticalGraphicalStaffEntryContainer;
        }
        for (let i: number = this.verticalGraphicalStaffEntryContainers.length - 1; i >= 0; i--) {
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp.lt(timestamp)) {
                const verticalGraphicalStaffEntryContainer: VerticalGraphicalStaffEntryContainer =
                    new VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
                this.verticalGraphicalStaffEntryContainers.splice(i + 1, 0, verticalGraphicalStaffEntryContainer);
                return verticalGraphicalStaffEntryContainer;
            }
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp.Equals(timestamp)) {
                return this.verticalGraphicalStaffEntryContainers[i];
            }
        }
        return undefined;
    }

    /**
     * Does a binary search on the container list and returns the VerticalContainer with the given Timestamp.
     * The search begins at startIndex, if given.
     * If the timestamp cannot be found, null is returned.
     * @param timestamp - The timestamp for which the container shall be found.
     * @param startIndex - The index from which the search starts in the container list.
     * @returns {any}
     * @constructor
     */
    public GetVerticalContainerFromTimestamp(timestamp: Fraction, startIndex: number = 0): VerticalGraphicalStaffEntryContainer {
        const index: number = CollectionUtil.binarySearch(this.verticalGraphicalStaffEntryContainers,
                                                          new VerticalGraphicalStaffEntryContainer(0, timestamp),
                                                          VerticalGraphicalStaffEntryContainer.compareByTimestamp,
                                                          startIndex);
        if (index >= 0) {
            return this.verticalGraphicalStaffEntryContainers[index];
        }
        return undefined;
    }

    /**
     * Perform a binary search for the absolute given Timestamp in all the GraphicalVerticalContainers.
     * @param musicTimestamp
     * @returns {number}
     * @constructor
     */
    public GetInterpolatedIndexInVerticalContainers(musicTimestamp: Fraction): number {
        const containers: VerticalGraphicalStaffEntryContainer[] = this.verticalGraphicalStaffEntryContainers;
        if (containers.length === 1) {
            return 0; // this fixes an error with Noteflight samples, see below (#1473). It may also be faster.
        }
        let leftIndex: number = 0;
        let rightIndex: number = containers.length - 1;
        let leftTS: Fraction = undefined;
        let rightTS: Fraction = undefined;
        // TODO AbsoluteTimestamp can be NaN in some erroneous MusicXML files like from Noteflight, see omd issue #1473
        //   (though in the sample tested, there is only one container, so above containers.length === 1 prevents the error)
        if (musicTimestamp.lte(containers[containers.length - 1].AbsoluteTimestamp)) {
            while (rightIndex - leftIndex > 1) {
                const middleIndex: number = Math.floor((rightIndex + leftIndex) / 2);
                if (containers[leftIndex].AbsoluteTimestamp.Equals(musicTimestamp)) {
                    rightIndex = leftIndex;
                    break;
                } else if (containers[rightIndex].AbsoluteTimestamp.Equals(musicTimestamp)) {
                    leftIndex = rightIndex;
                    break;
                } else if (containers[middleIndex].AbsoluteTimestamp.Equals(musicTimestamp)) {
                    return this.verticalGraphicalStaffEntryContainers.indexOf(containers[middleIndex]);
                } else if (musicTimestamp.lt(containers[middleIndex].AbsoluteTimestamp)) {
                    rightIndex = middleIndex;
                } else {
                    leftIndex = middleIndex;
                }
            }

            // no interpolation needed
            if (leftIndex === rightIndex) {
                return this.verticalGraphicalStaffEntryContainers.indexOf(containers[leftIndex]);
            }
            leftTS = containers[leftIndex].AbsoluteTimestamp;
            rightTS = containers[rightIndex].AbsoluteTimestamp;
        } else {
            leftTS = containers[containers.length - 1].AbsoluteTimestamp;
            rightTS = Fraction.plus(this.getLongestStaffEntryDuration(containers.length - 1), leftTS);
            rightIndex = containers.length;
        }
        const diff: number = rightTS.RealValue - leftTS.RealValue;
        const diffTS: number = rightTS.RealValue - musicTimestamp.RealValue;

        // estimate the interpolated index
        const foundIndex: number = rightIndex - (diffTS / diff);
        return Math.min(foundIndex, this.verticalGraphicalStaffEntryContainers.length - 1);
    }

    /**
     * Get a List with the indices of all the visible GraphicalMeasures and calculates their
     * corresponding indices in the first SourceMeasure, taking into account Instruments with multiple Staves.
     * @param visibleMeasures
     * @returns {number[]}
     */
    public getVisibleStavesIndicesFromSourceMeasure(visibleMeasures: GraphicalMeasure[]): number[] {
        const visibleInstruments: Instrument[] = [];
        const visibleStavesIndices: number[] = [];
        for (let idx: number = 0, len: number = visibleMeasures.length; idx < len; ++idx) {
            const graphicalMeasure: GraphicalMeasure = visibleMeasures[idx];
            const instrument: Instrument = graphicalMeasure.ParentStaff.ParentInstrument;
            if (visibleInstruments.indexOf(instrument) === -1) {
                visibleInstruments.push(instrument);
            }
        }
        for (let idx: number = 0, len: number = visibleInstruments.length; idx < len; ++idx) {
            const instrument: Instrument = visibleInstruments[idx];
            const index: number = this.musicSheet.getGlobalStaffIndexOfFirstStaff(instrument);
            for (let j: number = 0; j < instrument.Staves.length; j++) {
                visibleStavesIndices.push(index + j);
            }
        }
        return visibleStavesIndices;
    }

    /**
     * Returns the GraphicalMeasure with the given SourceMeasure as Parent at the given staff index.
     * @param sourceMeasure
     * @param staffIndex
     * @returns {any}
     */
    public getGraphicalMeasureFromSourceMeasureAndIndex(sourceMeasure: SourceMeasure, staffIndex: number): GraphicalMeasure {
        for (let i: number = 0; i < this.measureList.length; i++) {
            if (this.measureList[i][0]?.parentSourceMeasure === sourceMeasure) {
                return this.measureList[i][staffIndex];
            }
        }
        return undefined;
    }

    public getLastGraphicalMeasureFromIndex(staffIndex: number, lastRendered: boolean = true): GraphicalMeasure {
        let measureIndex: number = this.measureList.length - 1;
        if (lastRendered) {
            measureIndex = Math.min(measureIndex, this.musicSheet.Rules.MaxMeasureToDrawIndex);
        }
        let measure: GraphicalMeasure = this.measureList[measureIndex][staffIndex];
        while (!measure && measureIndex >= 0) { // check for undefined measures, e.g. multi-measure-rest
            measure = this.measureList[--measureIndex][staffIndex];
        }
        return this.measureList[measureIndex][staffIndex];
    }

    public getMeasureIndex(graphicalMeasure: GraphicalMeasure, measureIndex: number, inListIndex: number): boolean {
        measureIndex = 0;
        inListIndex = 0;
        for (; measureIndex < this.measureList.length; measureIndex++) {
            for (let idx: number = 0, len: number = this.measureList[measureIndex].length; idx < len; ++idx) {
                const measure: GraphicalMeasure = this.measureList[measureIndex][idx];
                if (measure === graphicalMeasure) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Generic method to find graphical objects on the sheet at a given location.
     * @param clickPosition Position in units where we are searching on the sheet
     * @param className String representation of the class we want to find. Must extend GraphicalObject
     * @param startSearchArea The area in units around our point to look for our graphical object, default 5
     * @param maxSearchArea The max area we want to search around our point
     * @param searchAreaIncrement The amount we expand our search area for each iteration that we don't find an object of the given type
     * @param shouldBeIncludedTest A callback that determines if the object should be included in our results- return false for no, true for yes
     */
    private GetNearestGraphicalObject<T extends GraphicalObject>(
        clickPosition: PointF2D, className: string = GraphicalObject.name,
        startSearchArea: number = 5, maxSearchArea: number = 20, searchAreaIncrement: number = 5,
        shouldBeIncludedTest: (objectToTest: T) => boolean = undefined): T {
        const foundEntries: T[] = [];
        //Loop until we find some, or our search area is out of bounds
        while (foundEntries.length === 0 && startSearchArea <= maxSearchArea) {
            //Prepare search area
            const region: BoundingBox = new BoundingBox(undefined);
            region.BorderLeft = clickPosition.x - startSearchArea;
            region.BorderTop = clickPosition.y - startSearchArea;
            region.BorderRight = clickPosition.x + startSearchArea;
            region.BorderBottom = clickPosition.y + startSearchArea;
            region.AbsolutePosition = new PointF2D(clickPosition.x, clickPosition.y);
            region.calculateAbsolutePosition();
            //Loop through music pages
            for (let idx: number = 0, len: number = this.MusicPages.length; idx < len; ++idx) {
                const graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
                const entries: T[] = graphicalMusicPage.PositionAndShape.getObjectsInRegion<T>(region, false, className);
                //If we have no entries on this page, skip to next (if exists)
                if (!entries || entries.length === 0) {
                    continue;
                } else {
                    //Otherwise test all our entries if applicable, store on our found list
                    for (let idx2: number = 0, len2: number = entries.length; idx2 < len2; ++idx2) {
                        if (!shouldBeIncludedTest) {
                            foundEntries.push(entries[idx2]);
                        } else if (shouldBeIncludedTest(entries[idx2])) {
                            foundEntries.push(entries[idx2]);
                        }
                    }
                }
            }
            //Expand search area, we haven't found anything yet
            startSearchArea += searchAreaIncrement;
        }
        // Get closest entry
        let closest: T = undefined;
        for (let idx: number = 0, len: number = foundEntries.length; idx < len; ++idx) {
            const object: T = foundEntries[idx];
            if (closest === undefined) {
                closest = object;
            } else {
                const deltaNew: number = this.CalculateDistance(object.PositionAndShape.AbsolutePosition, clickPosition);
                const deltaOld: number = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld) {
                    closest = object;
                }
            }
        }
        if (closest) {
            return closest;
        }
        return undefined;
    }

    public GetNearestVoiceEntry(clickPosition: PointF2D): GraphicalVoiceEntry {
        return this.GetNearestGraphicalObject<GraphicalVoiceEntry>(clickPosition, GraphicalVoiceEntry.name, 5, 20, 5,
                                                                   (object: GraphicalVoiceEntry) =>
                                                                        object.parentStaffEntry?.relInMeasureTimestamp !== undefined);
    }

    public GetNearestNote(clickPosition: PointF2D, maxClickDist: PointF2D): GraphicalNote {
        const nearestVoiceEntry: GraphicalVoiceEntry = this.GetNearestVoiceEntry(clickPosition);
        if (!nearestVoiceEntry) {
            return undefined;
        }
        let closestNote: GraphicalNote;
        let closestDist: number = Number.MAX_SAFE_INTEGER;
        // debug: show position in sheet. line starts from the click position, until clickposition.x + 2
        // (this.drawer as any).DrawOverlayLine( // as VexFlowMusicSheetDrawer
        //     clickPosition,
        //     new PointF2D(clickPosition.x + 2, clickPosition.y),
        //     this.MusicPages[0]);
        for (const note of nearestVoiceEntry.notes) {
            const posY: number = note.PositionAndShape.AbsolutePosition.y;
            const distX: number = Math.abs(note.PositionAndShape.AbsolutePosition.x - clickPosition.x);
            const distY: number = Math.abs(posY - clickPosition.y);
            // console.log("note: " + note.sourceNote.Pitch.ToString());
            if (distX + distY < closestDist) {
                closestNote = note;
                closestDist = distX + distY;
            }
        }
        return closestNote;
    }

    public domToSvg(point: PointF2D): PointF2D {
        return this.domToSvgTransform(point, true);
    }

    public svgToDom(point: PointF2D): PointF2D {
        return this.domToSvgTransform(point, false);
    }

    public svgToOsmd(point: PointF2D): PointF2D {
        const pt: PointF2D = new PointF2D(point.x, point.y);
        pt.x /= 10; // unitInPixels would need to be imported from VexFlowMusicSheetDrawer
        pt.y /= 10;
        return pt;
    }

    // TODO move to VexFlowMusicSheetDrawer? better fit for imports
    private domToSvgTransform(point: PointF2D, inverse: boolean): PointF2D {
        const svgBackend: any = (this.drawer as any).Backends[0]; // as SvgVexFlowBackend;
        // TODO importing SvgVexFlowBackend here causes build problems. Importing VexFlowMusicSheetDrawer seems to be fine, but unnecessary.
        // if (!(svgBackend instanceof SvgVexFlowBackend)) {
        //     return undefined;
        // }
        const svg: SVGSVGElement = svgBackend.getSvgElement() as SVGSVGElement;
        const pt: SVGPoint = svg.createSVGPoint();
        pt.x = point.x;
        pt.y = point.y;
        let transformMatrix: DOMMatrix = svg.getScreenCTM();
        if (inverse) {
            transformMatrix = transformMatrix.inverse();
        }
        const sp: SVGPoint = pt.matrixTransform(transformMatrix);
        return new PointF2D(sp.x, sp.y);
    }

    public GetClickableLabel(clickPosition: PointF2D): GraphicalLabel {
        const initialSearchAreaX: number = 4;
        const initialSearchAreaY: number = 4;
        // Prepare search area
        const region: BoundingBox = new BoundingBox();
        region.BorderLeft = clickPosition.x - initialSearchAreaX;
        region.BorderTop = clickPosition.y - initialSearchAreaY;
        region.BorderRight = clickPosition.x + initialSearchAreaX;
        region.BorderBottom = clickPosition.y + initialSearchAreaY;
        region.AbsolutePosition = new PointF2D(0, 0);
        for (let idx: number = 0, len: number = this.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            const entries: GraphicalLabel[] = graphicalMusicPage.PositionAndShape.getObjectsInRegion<GraphicalLabel>(region);
            if (entries.length !== 1) {
                continue;
            } else {
                for (let idx2: number = 0, len2: number = entries.length; idx2 < len2; ++idx2) {
                    const clickedLabel: GraphicalLabel = entries[idx2];
                    return clickedLabel;
                }
            }
        }
        return undefined;
    }

    public GetNearestStaffEntry(clickPosition: PointF2D): GraphicalStaffEntry {
        const initialSearchArea: number = 10;
        const foundEntries: GraphicalStaffEntry[] = [];
        // Prepare search area
        const region: BoundingBox = new BoundingBox(undefined);
        region.BorderLeft = clickPosition.x - initialSearchArea;
        region.BorderTop = clickPosition.y - initialSearchArea;
        region.BorderRight = clickPosition.x + initialSearchArea;
        region.BorderBottom = clickPosition.y + initialSearchArea;
        region.AbsolutePosition = new PointF2D(0, 0);
        // Search for StaffEntries in region
        for (let idx: number = 0, len: number = this.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            const entries: GraphicalStaffEntry[] = graphicalMusicPage.PositionAndShape.
                getObjectsInRegion<GraphicalStaffEntry>(region, false, GraphicalStaffEntry.name);
                // note that "GraphicalStaffEntry" instead of GraphicalStaffEntry.name doesn't work with minified builds
            if (!entries || entries.length === 0) {
                continue;
            } else {
                for (let idx2: number = 0, len2: number = entries.length; idx2 < len2; ++idx2) {
                    const gse: GraphicalStaffEntry = entries[idx2];
                    foundEntries.push(gse);
                }
            }
        }
        // Get closest entry
        let closest: GraphicalStaffEntry = undefined;
        for (let idx: number = 0, len: number = foundEntries.length; idx < len; ++idx) {
            const gse: GraphicalStaffEntry = foundEntries[idx];
            if (closest === undefined) {
                closest = gse;
            } else {
                if (!gse.relInMeasureTimestamp) {
                    continue;
                }
                const deltaNew: number = this.CalculateDistance(gse.PositionAndShape.AbsolutePosition, clickPosition);
                const deltaOld: number = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld) {
                    closest = gse;
                }
            }
        }
        if (closest) {
            return closest;
        }
        // TODO No staff entry was found. Feedback?
        // throw new ArgumentException("No staff entry found");
        return undefined;
    }

    /** Returns nearest object of type T near clickPosition.
     * E.g. GetNearestObject<GraphicalMeasure>(pos, GraphicalMeasure.name) returns the nearest measure.
     * Note that there is also GetNearestStaffEntry(), which has a bit more specific code for staff entries.
     * */
    public GetNearestObject<T extends GraphicalObject>(clickPosition: PointF2D, className: string): T {
        const initialSearchArea: number = 10;
        const foundEntries: T[] = [];
        // Prepare search area
        const region: BoundingBox = new BoundingBox(undefined);
        region.BorderLeft = clickPosition.x - initialSearchArea;
        region.BorderTop = clickPosition.y - initialSearchArea;
        region.BorderRight = clickPosition.x + initialSearchArea;
        region.BorderBottom = clickPosition.y + initialSearchArea;
        region.AbsolutePosition = new PointF2D(0, 0);
        // Search for StaffEntries in region
        for (let idx: number = 0, len: number = this.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            const entries: T[] = graphicalMusicPage.PositionAndShape.getObjectsInRegion<T>(region, false, className);
            if (!entries || entries.length === 0) {
                continue;
            } else {
                for (let idx2: number = 0, len2: number = entries.length; idx2 < len2; ++idx2) {
                    const entry: T = entries[idx2];
                    foundEntries.push(entry);
                }
            }
        }
        // Get closest entry
        let closest: T = undefined;
        for (let idx: number = 0, len: number = foundEntries.length; idx < len; ++idx) {
            const foundEntry: T = foundEntries[idx];
            if (closest === undefined) {
                closest = foundEntry;
            } else {
                // if (!foundEntry.relInMeasureTimestamp) {
                // relInMeasureTimestamp doesn't necessarily exist on generic type T, as it does on GraphicalStaffEntry
                //     continue;
                // }
                const deltaNew: number = this.CalculateDistance(foundEntry.PositionAndShape.AbsolutePosition, clickPosition);
                const deltaOld: number = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld) {
                    closest = foundEntry;
                }
            }
        }
        if (closest) {
            return closest;
        }
        // TODO No object of type T was found. Feedback?
        // throw new ArgumentException(`No object of type ${className} found`);
        return undefined;
    }


    public GetPossibleCommentAnchor(clickPosition: PointF2D): SourceStaffEntry {
        const entry: GraphicalStaffEntry = this.GetNearestStaffEntry(clickPosition);
        if (!entry) {
            return undefined;
        }
        return entry.sourceStaffEntry;
    }

    public getClickedObjectOfType<T>(positionOnMusicSheet: PointF2D): T {
        for (let idx: number = 0, len: number = this.musicPages.length; idx < len; ++idx) {
            const page: GraphicalMusicPage = this.musicPages[idx];
            const o: Object = page.PositionAndShape.getClickedObjectOfType<T>(positionOnMusicSheet);
            if (o) {
                return (o as T);
            }
        }
        return undefined;
    }

    public tryGetTimestampFromPosition(positionOnMusicSheet: PointF2D): Fraction {
        const entry: GraphicalStaffEntry = this.getClickedObjectOfType<GraphicalStaffEntry>(positionOnMusicSheet);
        if (!entry) {
            return undefined;
        }
        return entry.getAbsoluteTimestamp();
    }

    public tryGetClickableLabel(positionOnMusicSheet: PointF2D): GraphicalLabel {
        try {
            return this.GetClickableLabel(positionOnMusicSheet);
        } catch (ex) {
            log.info("GraphicalMusicSheet.tryGetClickableObject", "positionOnMusicSheet: " + positionOnMusicSheet, ex);
        }

        return undefined;
    }

    public tryGetTimeStampFromPosition(positionOnMusicSheet: PointF2D): Fraction {
        try {
            const entry: GraphicalStaffEntry = this.GetNearestStaffEntry(positionOnMusicSheet);
            if (!entry) {
                return undefined;
            }
            return entry.getAbsoluteTimestamp();
        } catch (ex) {
            log.info(
                "GraphicalMusicSheet.tryGetTimeStampFromPosition",
                "positionOnMusicSheet: " + positionOnMusicSheet, ex
            );
        }

        return undefined;
    }

    /**
     * Get visible staffentry for the container given by the index.
     * @param index
     * @returns {GraphicalStaffEntry}
     */
    public getStaffEntry(index: number): GraphicalStaffEntry {
        const container: VerticalGraphicalStaffEntryContainer = this.VerticalGraphicalStaffEntryContainers[index];
        let staffEntry: GraphicalStaffEntry = undefined;
        try {
            for (let idx: number = 0, len: number = container.StaffEntries.length; idx < len; ++idx) {
                const entry: GraphicalStaffEntry = container.StaffEntries[idx];
                if (!entry || !entry.sourceStaffEntry.ParentStaff.isVisible()) {
                    continue;
                }
                if (!staffEntry) {
                    staffEntry = entry;
                } else if (entry.PositionAndShape && staffEntry.PositionAndShape) {
                    if (staffEntry.PositionAndShape.RelativePosition.x > entry.PositionAndShape.RelativePosition.x) {
                        staffEntry = entry;
                    }
                }
            }
        } catch (ex) {
            log.info("GraphicalMusicSheet.getStaffEntry", ex);
        }

        return staffEntry;
    }

    /**
     * Returns the index of the closest previous (earlier) vertical container which has at least some visible staff entry, with respect to the given index.
     * @param index
     * @returns {number}
     * @constructor
     */
    public GetPreviousVisibleContainerIndex(index: number): number {
        for (let i: number = index - 1; i >= 0; i--) {
            const entries: GraphicalStaffEntry[] = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (let idx: number = 0, len: number = entries.length; idx < len; ++idx) {
                const entry: GraphicalStaffEntry = entries[idx];
                if (entry && entry.sourceStaffEntry.ParentStaff.isVisible()) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * Returns the index of the closest next (later) vertical container which has at least some visible staff entry, with respect to the given index.
     * @param index
     * @returns {number}
     * @constructor
     */
    public GetNextVisibleContainerIndex(index: number): number {
        for (let i: number = index + 1; i < this.verticalGraphicalStaffEntryContainers.length; ++i) {
            const entries: GraphicalStaffEntry[] = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (let idx: number = 0, len: number = entries.length; idx < len; ++idx) {
                const entry: GraphicalStaffEntry = entries[idx];
                if (entry && entry.sourceStaffEntry.ParentStaff.isVisible()) {
                    return i;
                }
            }
        }
        return -1;
    }

    public findClosestLeftStaffEntry(fractionalIndex: number, searchOnlyVisibleEntries: boolean): GraphicalStaffEntry {
        let foundEntry: GraphicalStaffEntry = undefined;
        let leftIndex: number = Math.floor(fractionalIndex);
        leftIndex = Math.min(this.VerticalGraphicalStaffEntryContainers.length - 1, leftIndex);
        for (let i: number = leftIndex; i >= 0; i--) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry) {
                if (searchOnlyVisibleEntries) {
                    if (foundEntry.sourceStaffEntry.ParentStaff.isVisible()) {
                        return foundEntry;
                    }
                } else {
                    return foundEntry;
                }
            }
        }
        return undefined;
    }

    public findClosestRightStaffEntry(fractionalIndex: number, returnOnlyVisibleEntries: boolean): GraphicalStaffEntry {
        let foundEntry: GraphicalStaffEntry = undefined;
        const rightIndex: number = Math.max(0, Math.ceil(fractionalIndex));
        for (let i: number = rightIndex; i < this.VerticalGraphicalStaffEntryContainers.length; i++) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry) {
                if (returnOnlyVisibleEntries) {
                    if (foundEntry.sourceStaffEntry.ParentStaff.isVisible()) {
                        return foundEntry;
                    }
                } else {
                    return foundEntry;
                }
            }
        }
        return undefined;
    }

    public calculateCursorLineAtTimestamp(musicTimestamp: Fraction, styleEnum: OutlineAndFillStyleEnum): GraphicalLine {
        const result: [number, MusicSystem] = this.calculateXPositionFromTimestamp(musicTimestamp);
        const xPos: number = result[0];
        const correspondingMusicSystem: MusicSystem = result[1];
        if (!correspondingMusicSystem || correspondingMusicSystem.StaffLines.length === 0) {
            return undefined;
        }
        const yCoordinate: number = correspondingMusicSystem.PositionAndShape.AbsolutePosition.y;
        const height: number = CollectionUtil.last(correspondingMusicSystem.StaffLines).PositionAndShape.RelativePosition.y + 4;
        return new GraphicalLine(new PointF2D(xPos, yCoordinate), new PointF2D(xPos, yCoordinate + height), 3, styleEnum);
    }

    public calculateXPositionFromTimestamp(timeStamp: Fraction): [number, MusicSystem] {
        let currentMusicSystem: MusicSystem = undefined;
        const fractionalIndex: number = this.GetInterpolatedIndexInVerticalContainers(timeStamp);
        const previousStaffEntry: GraphicalStaffEntry = this.findClosestLeftStaffEntry(fractionalIndex, true);
        const nextStaffEntry: GraphicalStaffEntry = this.findClosestRightStaffEntry(fractionalIndex, true);
        const currentTimeStamp: number = timeStamp.RealValue;
        if (!previousStaffEntry && !nextStaffEntry) {
            return [0, undefined];
        }
        let previousStaffEntryMusicSystem: MusicSystem = undefined;
        if (previousStaffEntry) {
            // TODO sometimes one of these ParentStaffLine is undefined, either fix this or handle it here
            previousStaffEntryMusicSystem = previousStaffEntry.parentMeasure.ParentStaffLine?.ParentMusicSystem;
        } else {
            previousStaffEntryMusicSystem = nextStaffEntry.parentMeasure.ParentStaffLine?.ParentMusicSystem;
        }
        let nextStaffEntryMusicSystem: MusicSystem = undefined;
        if (nextStaffEntry) {
            nextStaffEntryMusicSystem = nextStaffEntry.parentMeasure.ParentStaffLine?.ParentMusicSystem;
        } else {
            nextStaffEntryMusicSystem = previousStaffEntry.parentMeasure.ParentStaffLine?.ParentMusicSystem;
        }
        if (previousStaffEntryMusicSystem === nextStaffEntryMusicSystem) {
            currentMusicSystem = previousStaffEntryMusicSystem;
            let fraction: number;
            let previousStaffEntryPositionX: number;
            let nextStaffEntryPositionX: number;
            if (!previousStaffEntry) {
                previousStaffEntryPositionX = nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                fraction = 0;
            } else if (!nextStaffEntry) {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                nextStaffEntryPositionX = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                const sm: SourceMeasure = previousStaffEntry.parentMeasure.parentSourceMeasure;
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) / (
                    Fraction.plus(sm.AbsoluteTimestamp, sm.Duration).RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
            } else {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                if (previousStaffEntry === nextStaffEntry) {
                    fraction = 0;
                } else {
                    fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) /
                        (nextStaffEntry.getAbsoluteTimestamp().RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
                }
            }
            fraction = Math.min(1, Math.max(0, fraction));
            const interpolatedXPosition: number = previousStaffEntryPositionX + fraction * (nextStaffEntryPositionX - previousStaffEntryPositionX);
            return [interpolatedXPosition, currentMusicSystem];
        } else {
            const nextSystemLeftBorderTimeStamp: number = nextStaffEntry.parentMeasure.parentSourceMeasure.AbsoluteTimestamp.RealValue;
            let fraction: number;
            let interpolatedXPosition: number;
            if (currentTimeStamp < nextSystemLeftBorderTimeStamp && previousStaffEntryMusicSystem.StaffLines[0]) {
                // previousStaffEntryMusicSystem.StaffLines[0]: fix for drawing range set (previous system not rendered)
                currentMusicSystem = previousStaffEntryMusicSystem;
                const previousStaffEntryPositionX: number = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                const previousSystemRightBorderX: number = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) /
                    (nextSystemLeftBorderTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue);
                fraction = Math.min(1, Math.max(0, fraction));
                interpolatedXPosition = previousStaffEntryPositionX + fraction * (previousSystemRightBorderX - previousStaffEntryPositionX);
            } else {
                currentMusicSystem = nextStaffEntryMusicSystem;
                const nextStaffEntryPositionX: number = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                const nextSystemLeftBorderX: number = currentMusicSystem.GetLeftBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - nextSystemLeftBorderTimeStamp) /
                    (nextStaffEntry.getAbsoluteTimestamp().RealValue - nextSystemLeftBorderTimeStamp);
                fraction = Math.min(1, Math.max(0, fraction));
                interpolatedXPosition = nextSystemLeftBorderX + fraction * (nextStaffEntryPositionX - nextSystemLeftBorderX);
            }
            return [interpolatedXPosition, currentMusicSystem];
        }
    }

    public GetNumberOfVisibleInstruments(): number {
        let visibleInstrumentCount: number = 0;
        for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.musicSheet.Instruments[idx];
            if (instrument.isVisible()) {
                visibleInstrumentCount++;
            }
        }
        return visibleInstrumentCount;
    }

    public GetNumberOfFollowedInstruments(): number {
        let followedInstrumentCount: number = 0;
        for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.musicSheet.Instruments[idx];
            if (instrument.Following === true) {
                followedInstrumentCount++;
            }
        }
        return followedInstrumentCount;
    }

    /*public GetGraphicalFromSourceMeasure(sourceMeasure: SourceMeasure): GraphicalMeasure[] {
        return this.sourceToGraphicalMeasureLinks.getValue(sourceMeasure); // TODO gets wrong measure because sourceMeasure is not a valid key
    }*/

    public GetGraphicalFromSourceStaffEntry(sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry {
        if (!sourceStaffEntry.VerticalContainerParent.ParentMeasure?.VerticalMeasureList) {
            return undefined;
        }
        const graphicalMeasure: GraphicalMeasure = sourceStaffEntry.VerticalContainerParent.ParentMeasure.VerticalMeasureList
            [sourceStaffEntry.ParentStaff.idInMusicSheet];
        return graphicalMeasure?.findGraphicalStaffEntryFromTimestamp(sourceStaffEntry.Timestamp);
    }

    private CalculateDistance(pt1: PointF2D, pt2: PointF2D): number {
        const deltaX: number = pt1.x - pt2.x;
        const deltaY: number = pt1.y - pt2.y;
        return (deltaX * deltaX) + (deltaY * deltaY);
    }

    /**
     * Return the longest StaffEntry duration from a GraphicalVerticalContainer.
     * @param index the index of the vertical container
     * @returns {Fraction}
     */
    private getLongestStaffEntryDuration(index: number): Fraction {
        let maxLength: Fraction = new Fraction(0, 1);
        for (const graphicalStaffEntry of this.verticalGraphicalStaffEntryContainers[index].StaffEntries) {
            if (!graphicalStaffEntry) {
                continue;
            }
            const maxLengthInStaffEntry: Fraction = graphicalStaffEntry.findStaffEntryMaxNoteLength();
            if (maxLength.lt(maxLengthInStaffEntry)) {
                maxLength = maxLengthInStaffEntry;
            }
        }
        return maxLength;
    }
}

export class SystemImageProperties {
    public positionInPixels: PointF2D;
    public systemImageId: number;
    public system: MusicSystem;
}
