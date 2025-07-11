import { IXmlElement } from "./../Common/FileIO/Xml";
import { VexFlowMusicSheetCalculator } from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { VexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/VexFlowBackend";
import { MusicSheetReader } from "./../MusicalScore/ScoreIO/MusicSheetReader";
import { GraphicalMusicSheet } from "./../MusicalScore/Graphical/GraphicalMusicSheet";
import { MusicSheetCalculator } from "./../MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetDrawer } from "./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { SvgVexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import { CanvasVexFlowBackend } from "./../MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import { MusicSheet } from "./../MusicalScore/MusicSheet";
import { Cursor } from "./Cursor";
import { MXLHelper } from "../Common/FileIO/Mxl";
import { AJAX } from "./AJAX";
import log from "loglevel";
import { DrawingParameters } from "../MusicalScore/Graphical/DrawingParameters";
import { DrawingParametersEnum } from "../Common/Enums/DrawingParametersEnum";
import { ColoringModes } from "../Common/Enums/ColoringModes";
import { IOSMDOptions, OSMDOptions, AutoBeamOptions, BackendType, CursorOptions, CursorType } from "./OSMDOptions";
import { EngravingRules, PageFormat } from "../MusicalScore/Graphical/EngravingRules";
import { AbstractExpression } from "../MusicalScore/VoiceData/Expressions/AbstractExpression";
import { Dictionary } from "typescript-collections";
import { AutoColorSet } from "../MusicalScore/Graphical/DrawingEnums";
import { GraphicalMusicPage } from "../MusicalScore/Graphical/GraphicalMusicPage";
import { MusicPartManagerIterator } from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import { ITransposeCalculator } from "../MusicalScore/Interfaces/ITransposeCalculator";
import { NoteEnum } from "../Common/DataObjects/Pitch";

/**
 * The main class and control point of OpenSheetMusicDisplay.<br>
 * It can display MusicXML sheet music files in an HTML element container.<br>
 * After the constructor, use load() and render() to load and render a MusicXML file.
 */
export class OpenSheetMusicDisplay {
    protected version: string = "1.9.0-dev"; // getter: this.Version
    // at release, bump version and change to -release, afterwards to -dev again

    /**
     * Creates and attaches an OpenSheetMusicDisplay object to an HTML element container.<br>
     * After the constructor, use load() and render() to load and render a MusicXML file.
     * @param container The container element OSMD will be rendered into.<br>
     *                  Either a string specifying the ID of an HTML container element,<br>
     *                  or a reference to the HTML element itself (e.g. div)
     * @param options An object for rendering options like the backend (svg/canvas) or autoResize.<br>
     *                For defaults see the OSMDOptionsStandard method in the [[OSMDOptions]] class.
     */
    constructor(container: string | HTMLElement,
                options: IOSMDOptions = OSMDOptions.OSMDOptionsStandard()) {
        // Store container element
        if (typeof container === "string") {
            // ID passed
            this.container = document.getElementById(<string>container);
        } else if (container && "appendChild" in <any>container) {
            // Element passed
            this.container = <HTMLElement>container;
        }
        if (!this.container) {
            throw new Error("Please pass a valid div container to OpenSheetMusicDisplay");
        }

        if (options.autoResize === undefined) {
            options.autoResize = true;
        }
        this.backendType = BackendType.SVG; // default, can be changed by options
        this.setOptions(options);
    }

    /** Options from which OSMD creates cursors in enableOrDisableCursors(). */
    public cursorsOptions: CursorOptions[] = [];
    public cursors: Cursor[] = [];
    public get cursor(): Cursor { // lowercase for backwards compatibility since cursor -> cursors change
        return this.cursors[0];
    }
    public get Cursor(): Cursor {
        return this.cursor;
    }
    public zoom: number = 1.0;
    protected zoomUpdated: boolean = false;
    /** Timeout in milliseconds used in osmd.load(string) when string is a URL. */
    public loadUrlTimeout: number = 5000;

    protected container: HTMLElement;
    protected backendType: BackendType;
    protected needBackendUpdate: boolean;
    protected sheet: MusicSheet;
    protected drawer: VexFlowMusicSheetDrawer;
    protected drawBoundingBox: string;
    protected drawSkyLine: boolean;
    protected drawBottomLine: boolean;
    protected graphic: GraphicalMusicSheet;
    protected drawingParameters: DrawingParameters;
    protected rules: EngravingRules;
    protected autoResizeEnabled: boolean;
    protected resizeHandlerAttached: boolean;
    protected followCursor: boolean;
    /** A function that is executed when the XML has been read.
     * The return value will be used as the actual XML OSMD parses,
     * so you can make modifications to the xml that OSMD will use.
     * Note that this is (re-)set on osmd.setOptions as `{return xml}`, unless you specify the function in the options. */
    public OnXMLRead: (xml: string) => string;

    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     * @param tempTitle is used as the title for the piece if there is no title in the XML.
     */
    public load(content: string | Document, tempTitle: string = "Untitled Score"): Promise<{}> {
        // Warning! This function is asynchronous! No error handling is done here.
        this.reset();
        //console.log("typeof content: " + typeof content);
        if (typeof content === "string") {
            const str: string = <string>content;
            const self: OpenSheetMusicDisplay = this;
            // console.log("substring: " + str.substr(0, 5));
            if (str.startsWith("\x50\x4b\x03\x04")) {
                log.debug("[OSMD] This is a zip file, unpack it first: " + str);
                // This is a zip file, unpack it first
                return MXLHelper.MXLtoXMLstring(str).then(
                    (x: string) => {
                        return self.load(x);
                    },
                    (err: any) => {
                        log.debug(err);
                        throw new Error("OpenSheetMusicDisplay: Invalid MXL file");
                    }
                );
            }
            // Javascript loads strings as utf-16, which is wonderful BS if you want to parse UTF-8 :S
            if (str.startsWith("\uf7ef\uf7bb\uf7bf")) {
                log.debug("[OSMD] UTF with BOM detected, truncate first 3 bytes and pass along: " + str);
                // UTF with BOM detected, truncate first three bytes and pass along
                return self.load(str.substring(3));
            }
            let trimmedStr: string = str;
            if (/^\s/.test(trimmedStr)) { // only trim if we need to. (end of string is irrelevant)
                trimmedStr = trimmedStr.trim(); // trim away empty lines at beginning etc
            }
            if (trimmedStr.startsWith("<?xml")) { // first character is sometimes null, making first five characters '<?xm'.
                const modifiedXml: string = this.OnXMLRead(trimmedStr); // by default just returns trimmedStr unless a function options.OnXMLRead was set.
                log.debug("[OSMD] Finally parsing XML content, length: " + modifiedXml.length);
                // Parse the string representing an xml file
                const parser: DOMParser = new DOMParser();
                content = parser.parseFromString(modifiedXml, "application/xml");
            } else if (trimmedStr.length < 2083) { // TODO do proper URL format check
                log.debug("[OSMD] Retrieve the file at the given URL: " + trimmedStr);
                // Assume now "str" is a URL
                // Retrieve the file at the given URL
                return AJAX.ajax(trimmedStr, this.loadUrlTimeout).then(
                    (s: string) => { return self.load(s); },
                    (exc: Error) => { throw exc; }
                );
            } else {
                console.error("[OSMD] osmd.load(string): Could not process string. Did not find <?xml at beginning.");
            }
        }

        if (!content || !(<any>content).nodeName) {
            return Promise.reject(new Error("OpenSheetMusicDisplay: The document which was provided is invalid"));
        }
        const xmlDocument: Document = (<Document>content);
        const xmlDocumentNodes: NodeList = xmlDocument.childNodes;
        log.debug("[OSMD] load(), Document url: " + xmlDocument.URL);

        let scorePartwiseElement: Element;
        for (let i: number = 0, length: number = xmlDocumentNodes.length; i < length; i += 1) {
            const node: Node = xmlDocumentNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                scorePartwiseElement = <Element>node;
                break;
            }
        }
        if (!scorePartwiseElement) {
            console.error("Could not parse MusicXML, no valid partwise element found");
            return Promise.reject(new Error("OpenSheetMusicDisplay: Document is not a valid 'partwise' MusicXML"));
        }
        const score: IXmlElement = new IXmlElement(scorePartwiseElement);
        const reader: MusicSheetReader = new MusicSheetReader(undefined, this.rules);
        this.sheet = reader.createMusicSheet(score, tempTitle);
        if (this.sheet === undefined) {
            // error loading sheet, probably already logged, do nothing
            return Promise.reject(new Error("given music sheet was incomplete or could not be loaded."));
        }
        // if (this.sheet.TitleString === "osmd.Version") {
        //     this.sheet.TitleString = "OSMD version: " + this.Version; // useful for debug e.g. when console not available
        // }
        log.info(`[OSMD] Loaded sheet ${this.sheet.TitleString} successfully.`);

        this.needBackendUpdate = true;
        this.updateGraphic();

        return Promise.resolve({});
    }

    /**
     * (Re-)creates the graphic sheet from the music sheet
     */
    public updateGraphic(): void {
        const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator(this.rules);
        this.graphic = new GraphicalMusicSheet(this.sheet, calc);
        if (this.drawingParameters.drawCursors) {
            this.cursors.forEach(cursor => {
                cursor.init(this.sheet.MusicPartManager, this.graphic);
            });
        }
        if (this.drawingParameters.DrawingParametersEnum === DrawingParametersEnum.leadsheet) {
            this.graphic.LeadSheet = true;
        }
    }

    /** Render the loaded music sheet to the container. */
    public render(): void {
        if (!this.graphic) {
            throw new Error("OSMD: load() needs to be called before render()");
        }
        this.drawer?.clear(); // clear canvas before setting width
        // this.graphic.GetCalculator.clearSystemsAndMeasures(); // maybe?
        // this.graphic.GetCalculator.clearRecreatedObjects();

        // drawing range: check if pickup measure and start or end measure number > 1
        if (this.Sheet.SourceMeasures[0].ImplicitMeasure) {
            if (this.rules.MinMeasureToDrawNumber > 1) {
                this.rules.MinMeasureToDrawIndex = this.rules.MinMeasureToDrawNumber; // -1 for index, +1 for pickup
            }
            if (this.rules.MaxMeasureToDrawNumber > 0) {
                this.rules.MaxMeasureToDrawIndex = this.rules.MaxMeasureToDrawNumber; // -1 for index, +1 for pickup
            }
        }

        // Set page width
        let width: number = this.container.offsetWidth;
        if (this.rules.RenderSingleHorizontalStaffline) {
            width = this.rules.SheetMaximumWidth; // set safe maximum (browser limit), will be reduced later
            // reduced later in MusicSheetCalculator.calculatePageLabels (sets sheet.pageWidth to page.PositionAndShape.Size.width before labels)
            // rough calculation:
            // width = 600 * this.sheet.SourceMeasures.length;
        }
        // log.debug("[OSMD] render width: " + width);

        this.sheet.pageWidth = width / this.zoom / 10.0;
        if (this.rules.PageFormat && !this.rules.PageFormat.IsUndefined) {
            this.rules.PageHeight = this.sheet.pageWidth / this.rules.PageFormat.aspectRatio;
            log.debug("[OSMD] PageHeight: " + this.rules.PageHeight);
        } else {
            log.debug("[OSMD] endless/undefined pageformat, id: " + this.rules.PageFormat.idString);
            this.rules.PageHeight = 100001; // infinite page height // TODO maybe Number.MAX_VALUE or Math.pow(10, 20)?
        }

        // Before introducing the following optimization (maybe irrelevant), tests
        // have to be modified to ensure that width is > 0 when executed
        //if (isNaN(width) || width === 0) {
        //    return;
        //}

        // Calculate again
        this.graphic.reCalculate();

        if (this.drawingParameters.drawCursors) {
            this.graphic.Cursors.length = 0;
        }

        // needBackendUpdate is well intentioned, but we need to cover all cases.
        //   backends also need an update when this.zoom was set from outside, which unfortunately doesn't have a setter method to set this in.
        //   so just for compatibility, we need to assume users set osmd.zoom, so we'd need to check whether it was changed compared to last time.
        if (true || this.needBackendUpdate) {
            this.createOrRefreshRenderBackend();
            this.needBackendUpdate = false;
        }

        this.drawer.setZoom(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);

        this.enableOrDisableCursors(this.drawingParameters.drawCursors);

        if (this.drawingParameters.drawCursors) {
            // Update the cursor position
            this.cursors.forEach(cursor => {
                cursor.update();
            });
        }
        this.zoomUpdated = false;
        this.rules.RenderCount++;
        //console.log("[OSMD] render finished");
    }

    protected createOrRefreshRenderBackend(): void {
        // console.log("[OSMD] createOrRefreshRenderBackend()");

        // Remove old backends
        if (this.drawer && this.drawer.Backends) {
            // removing single children to remove all is error-prone, because sometimes a random SVG-child remains.
            // for (const backend of this.drawer.Backends) {
            //     backend.removeFromContainer(this.container);
            // }
            if (this.drawer.Backends[0]) {
                this.drawer.Backends[0].removeAllChildrenFromContainer(this.container);
            }
            for (const backend of this.drawer.Backends) {
                backend.free();
            }
            this.drawer.Backends.clear();
        }

        // Create the drawer
        this.drawingParameters.Rules = this.rules;
        this.drawer = new VexFlowMusicSheetDrawer(this.drawingParameters); // note that here the drawer.drawableBoundingBoxElement is lost. now saved in OSMD.
        this.drawer.drawableBoundingBoxElement = this.DrawBoundingBox;
        this.drawer.bottomLineVisible = this.drawBottomLine;
        this.drawer.skyLineVisible = this.drawSkyLine;

        // Set page width
        let width: number = this.container.offsetWidth;
        if (this.rules.RenderSingleHorizontalStaffline) {
            width = (this.EngravingRules.PageLeftMargin + this.graphic.MusicPages[0].PositionAndShape.Size.width + this.EngravingRules.PageRightMargin)
                * 10 * this.zoom;
            // this.container.style.width = width + "px";
            // console.log("width: " + width)
        }
        // TODO width may need to be coordinated with render() where width is also used
        let height: number;
        const canvasDimensionsLimit: number = 32767; // browser limitation. Chrome/Firefox (16 bit, 32768 causes an error).
        // Could be calculated by canvas-size module.
        // see #678 on Github and here: https://stackoverflow.com/a/11585939/10295942

        // TODO check if resize is necessary. set needResize or something when size was changed
        for (const page of this.graphic.MusicPages) {
            if (page.PageNumber > this.rules.MaxPageToDrawNumber) {
                break; // don't add the bounding boxes of pages that aren't drawn to the container height etc
            }
            const backend: VexFlowBackend = this.createBackend(this.backendType, page);
            const sizeWarningPartTwo: string = " exceeds CanvasBackend limit of 32767. Cutting off score.";
            if (backend.getOSMDBackendType() === BackendType.Canvas && width > canvasDimensionsLimit) {
                log.warn("[OSMD] Warning: width of " + width + sizeWarningPartTwo);
                width = canvasDimensionsLimit;
            }
            if (this.rules.PageFormat && !this.rules.PageFormat.IsUndefined) {
                height = width / this.rules.PageFormat.aspectRatio;
                // console.log("pageformat given. height: " + page.PositionAndShape.Size.height);
            } else {
                height = page.PositionAndShape.Size.height;
                height += this.rules.PageBottomMargin;
                if (backend.getOSMDBackendType() === BackendType.Canvas) {
                    height += 0.1; // Canvas bug: cuts off bottom pixel with PageBottomMargin = 0. Doesn't happen with SVG.
                    //  we could only add 0.1 if PageBottomMargin === 0, but that would mean a margin of 0.1 has no effect compared to 0.
                }
                //height += this.rules.CompactMode ? this.rules.PageTopMarginNarrow : this.rules.PageTopMargin;
                // adding the PageTopMargin with a composer label leads to the margin also added to the bottom of the page
                height += page.PositionAndShape.BorderTop;
                // try to respect elements like composer cut off: this gets messy.
                // if (page.PositionAndShape.BorderTop < 0 && this.rules.PageTopMargin === 0) {
                //     height += page.PositionAndShape.BorderTop + this.rules.PageTopMargin;
                // }
                if (this.rules.RenderTitle) {
                    height += this.rules.TitleTopDistance;
                }
                height *= this.zoom * 10.0;
                // console.log("pageformat not given. height: " + page.PositionAndShape.Size.height);
            }
            if (backend.getOSMDBackendType() === BackendType.Canvas && height > canvasDimensionsLimit) {
                log.warn("[OSMD] Warning: height of " + height + sizeWarningPartTwo);
                height = Math.min(height, canvasDimensionsLimit); // this cuts off the the score, but doesn't break rendering.
                // TODO optional: reduce zoom to fit the score within the limit.
            }

            backend.resize(width, height); // this resets strokeStyle for Canvas
            backend.clear(); // set bgcolor if defined (this.rules.PageBackgroundColor, see OSMDOptions)
            backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
            backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic); // needs to be set after resize()
            this.drawer.Backends.push(backend);
            this.graphic.drawer = this.drawer;
        }
    }

    // for now SVG only, see generateImages_browserless (PNG/SVG)
    public exportSVG(): void {
        for (const backend of this.drawer?.Backends) {
            if (backend instanceof SvgVexFlowBackend) {
                (backend as SvgVexFlowBackend).export();
            }
            // if we add CanvasVexFlowBackend exporting, rename function to export() or exportImages() again
        }
    }

    /** States whether the render() function can be safely called. */
    public IsReadyToRender(): boolean {
        return this.graphic !== undefined;
    }

    /** Clears what OSMD has drawn on its canvas. */
    public clear(): void {
        this.drawer?.clear();
        this.reset(); // without this, resize will draw loaded sheet again
    }

    /** Set OSMD rendering options using an IOSMDOptions object.
     *  Can be called during runtime. Also called by constructor.
     *  For example, setOptions({autoResize: false}) will disable autoResize even during runtime.
     */
    public setOptions(options: IOSMDOptions): void {
        if (!this.rules) {
            this.rules = new EngravingRules();
        }
        if (!this.drawingParameters && !options.drawingParameters) {
            this.drawingParameters = new DrawingParameters(DrawingParametersEnum.default, this.rules);
            // if "default", will be created below
        } else if (options.drawingParameters) {
            if (!this.drawingParameters) {
                this.drawingParameters = new DrawingParameters(DrawingParametersEnum[options.drawingParameters], this.rules);
            } else {
                this.drawingParameters.DrawingParametersEnum =
                    (<any>DrawingParametersEnum)[options.drawingParameters.toLowerCase()];
                    // see DrawingParameters.ts: set DrawingParametersEnum, and DrawingParameters.ts:setForCompactTightMode()
            }
        }
        if (options === undefined || options === null) {
            log.warn("warning: osmd.setOptions() called without an options parameter, has no effect."
                + "\n" + "example usage: osmd.setOptions({drawCredits: false, drawPartNames: false})");
            return;
        }
        this.OnXMLRead = function(xml): string {return xml;};
        if (options.onXMLRead) {
            this.OnXMLRead = options.onXMLRead;
        }

        const backendNotInitialized: boolean = !this.drawer || !this.drawer.Backends || this.drawer.Backends.length < 1;
        let needBackendUpdate: boolean = backendNotInitialized;
        if (options.backend !== undefined) {
            const backendTypeGiven: BackendType = OSMDOptions.BackendTypeFromString(options.backend);
            needBackendUpdate = needBackendUpdate || this.backendType !== backendTypeGiven;
            this.backendType = backendTypeGiven;
        }
        this.needBackendUpdate = needBackendUpdate;
        // TODO this is a necessary step during the OSMD constructor. Maybe move this somewhere else

        // individual drawing parameters options
        if (options.autoBeam !== undefined) { // only change an option if it was given in options, otherwise it will be undefined
            this.rules.AutoBeamNotes = options.autoBeam;
        }
        const autoBeamOptions: AutoBeamOptions = options.autoBeamOptions;
        if (autoBeamOptions) {
            if (autoBeamOptions.maintain_stem_directions === undefined) {
                autoBeamOptions.maintain_stem_directions = false;
            }
            this.rules.AutoBeamOptions = autoBeamOptions;
            if (autoBeamOptions.groups && autoBeamOptions.groups.length) {
                for (const fraction of autoBeamOptions.groups) {
                    if (fraction.length !== 2) {
                        throw new Error("Each fraction in autoBeamOptions.groups must be of length 2, e.g. [3,4] for beaming three fourths");
                    }
                }
            }
        }
        if (options.percussionOneLineCutoff !== undefined) {
            this.rules.PercussionOneLineCutoff = options.percussionOneLineCutoff;
        }
        if (this.rules.PercussionOneLineCutoff !== 0 &&
            options.percussionForceVoicesOneLineCutoff !== undefined) {
            this.rules.PercussionForceVoicesOneLineCutoff = options.percussionForceVoicesOneLineCutoff;
        }
        if (options.alignRests !== undefined) {
            this.rules.AlignRests = options.alignRests;
        }
        if (options.coloringMode !== undefined) {
            this.setColoringMode(options);
        }
        if (options.coloringEnabled !== undefined) {
            this.rules.ColoringEnabled = options.coloringEnabled;
        }
        if (options.colorStemsLikeNoteheads !== undefined) {
            this.rules.ColorStemsLikeNoteheads = options.colorStemsLikeNoteheads;
        }
        if (options.disableCursor) {
            this.drawingParameters.drawCursors = false;
        }

        // alternative to if block: this.drawingsParameters.drawCursors = options.drawCursors !== false. No if, but always sets drawingParameters.
        // note that every option can be undefined, which doesn't mean the option should be set to false.
        if (options.drawHiddenNotes) {
            this.drawingParameters.drawHiddenNotes = true; // not yet supported
        }
        if (options.drawCredits !== undefined) {
            this.drawingParameters.DrawCredits = options.drawCredits; // sets DrawComposer, DrawTitle, DrawSubtitle, DrawLyricist.
        }
        if (options.drawComposer !== undefined) {
            this.drawingParameters.DrawComposer = options.drawComposer;
        }
        if (options.drawTitle !== undefined) {
            this.drawingParameters.DrawTitle = options.drawTitle;
        }
        if (options.drawSubtitle !== undefined) {
            this.drawingParameters.DrawSubtitle = options.drawSubtitle;
        }
        if (options.drawLyricist !== undefined) {
            this.drawingParameters.DrawLyricist = options.drawLyricist;
        }
        if (options.drawMetronomeMarks !== undefined) {
            this.rules.MetronomeMarksDrawn = options.drawMetronomeMarks;
        }
        if (options.drawPartNames !== undefined) {
            this.drawingParameters.DrawPartNames = options.drawPartNames; // indirectly writes to EngravingRules

            // by default, disable part abbreviations too, unless set explicitly.
            if (!options.drawPartAbbreviations) {
                this.rules.RenderPartAbbreviations = options.drawPartNames;
            }
        }
        if (options.drawPartAbbreviations !== undefined) {
            this.rules.RenderPartAbbreviations = options.drawPartAbbreviations;
        }
        if (options.drawFingerings === false) {
            this.rules.RenderFingerings = false;
        }
        if (options.drawMeasureNumbers !== undefined) {
            this.rules.RenderMeasureNumbers = options.drawMeasureNumbers;
        }
        if (options.drawMeasureNumbersOnlyAtSystemStart) {
            this.rules.RenderMeasureNumbersOnlyAtSystemStart = options.drawMeasureNumbersOnlyAtSystemStart;
        }
        if (options.drawLyrics !== undefined) {
            this.rules.RenderLyrics = options.drawLyrics;
        }
        if (options.drawTimeSignatures !== undefined) {
            this.rules.RenderTimeSignatures = options.drawTimeSignatures;
        }
        if (options.drawSlurs !== undefined) {
            this.rules.RenderSlurs = options.drawSlurs;
        }
        if (options.measureNumberInterval !== undefined) {
            this.rules.MeasureNumberLabelOffset = options.measureNumberInterval;
        }
        if (options.useXMLMeasureNumbers !== undefined) {
            this.rules.UseXMLMeasureNumbers = options.useXMLMeasureNumbers;
        }
        if (options.fingeringPosition !== undefined) {
            this.rules.FingeringPosition = AbstractExpression.PlacementEnumFromString(options.fingeringPosition);
        }
        if (options.fingeringInsideStafflines !== undefined) {
            this.rules.FingeringInsideStafflines = options.fingeringInsideStafflines;
        }
        if (options.newSystemFromXML !== undefined) {
            this.rules.NewSystemAtXMLNewSystemAttribute = options.newSystemFromXML;
        }
        if (options.newSystemFromNewPageInXML !== undefined) {
            this.rules.NewSystemAtXMLNewPageAttribute = options.newSystemFromNewPageInXML;
        }
        if (options.newPageFromXML !== undefined) {
            this.rules.NewPageAtXMLNewPageAttribute = options.newPageFromXML;
        }
        if (options.fillEmptyMeasuresWithWholeRest !== undefined) {
            this.rules.FillEmptyMeasuresWithWholeRest = options.fillEmptyMeasuresWithWholeRest;
        }
        if (options.followCursor !== undefined) {
            this.FollowCursor = options.followCursor;
        }
        if (options.setWantedStemDirectionByXml !== undefined) {
            this.rules.SetWantedStemDirectionByXml = options.setWantedStemDirectionByXml;
        }
        if (options.darkMode) {
            this.rules.applyDefaultColorMusic("#FFFFFF");
            this.rules.PageBackgroundColor = "#000000";
            this.rules.DarkModeEnabled = true;
        } else if (options.darkMode === false) { // not if undefined!
            this.rules.applyDefaultColorMusic("#000000");
            this.rules.PageBackgroundColor = undefined;
            this.rules.DarkModeEnabled = false;
        }
        if (options.defaultColorMusic) {
            this.rules.applyDefaultColorMusic(options.defaultColorMusic);
        }
        if (options.defaultColorNotehead) {
            this.rules.DefaultColorNotehead = options.defaultColorNotehead;
        }
        if (options.defaultColorRest) {
            this.rules.DefaultColorRest = options.defaultColorRest;
        }
        if (options.defaultColorStem) {
            this.rules.DefaultColorStem = options.defaultColorStem;
        }
        if (options.defaultColorLabel) {
            this.rules.DefaultColorLabel = options.defaultColorLabel;
        }
        if (options.defaultColorTitle) {
            this.rules.DefaultColorTitle = options.defaultColorTitle;
        }
        if (options.defaultFontFamily) {
            this.rules.DefaultFontFamily = options.defaultFontFamily; // default "Times New Roman", also used if font family not found
        }
        if (options.defaultFontStyle) {
            this.rules.DefaultFontStyle = options.defaultFontStyle; // e.g. FontStyles.Bold
        }
        if (options.drawUpToMeasureNumber >= 0) {
            this.rules.MaxMeasureToDrawIndex = Math.max(options.drawUpToMeasureNumber - 1, 0);
            this.rules.MaxMeasureToDrawNumber = options.drawUpToMeasureNumber;
        }
        if (options.drawFromMeasureNumber >= 0) {
            this.rules.MinMeasureToDrawIndex = Math.max(options.drawFromMeasureNumber - 1, 0);
            this.rules.MinMeasureToDrawNumber = options.drawFromMeasureNumber;
            // if there's a pickup measure (index and number 0), the start index might need to be + 1
            //   depending on which measure you start rendering from (measure 2 for example, instead of 0),
            //   so it is currently useful to store this option value separately from the index, to readjust the index.
        }
        if (options.drawUpToPageNumber) {
            this.rules.MaxPageToDrawNumber = options.drawUpToPageNumber;
        }
        if (options.drawUpToSystemNumber) {
            this.rules.MaxSystemToDrawNumber = options.drawUpToSystemNumber;
        }
        if (options.tupletsRatioed) {
            this.rules.TupletsRatioed = true;
        }
        if (options.tupletsBracketed) {
            this.rules.TupletsBracketed = true;
        }
        if (options.tripletsBracketed) {
            this.rules.TripletsBracketed = true;
        }
        if (options.autoResize) {
            if (!this.resizeHandlerAttached) {
                this.autoResize();
            }
            this.autoResizeEnabled = true;
        } else if (options.autoResize === false) { // not undefined
            this.autoResizeEnabled = false;
            // we could remove the window EventListener here, but not necessary.
        }
        if (options.pageFormat !== undefined) { // only change this option if it was given, see above
            this.setPageFormat(options.pageFormat);
        }
        if (options.pageBackgroundColor !== undefined) {
            this.rules.PageBackgroundColor = options.pageBackgroundColor;
        }
        if (options.renderSingleHorizontalStaffline !== undefined) {
            this.rules.RenderSingleHorizontalStaffline = options.renderSingleHorizontalStaffline;
        }
        if (options.spacingFactorSoftmax !== undefined) {
            this.rules.SoftmaxFactorVexFlow = options.spacingFactorSoftmax;
        }
        if (options.spacingBetweenTextLines !== undefined) {
            this.rules.SpacingBetweenTextLines = options.spacingBetweenTextLines;
        }
        if (options.stretchLastSystemLine !== undefined) {
            this.rules.StretchLastSystemLine = options.stretchLastSystemLine;
        }
        if (options.autoGenerateMultipleRestMeasuresFromRestMeasures !== undefined) {
            this.rules.AutoGenerateMultipleRestMeasuresFromRestMeasures = options.autoGenerateMultipleRestMeasuresFromRestMeasures;
        }
        if (options.cursorsOptions !== undefined) {
            this.cursorsOptions = options.cursorsOptions;
        } else {
            this.cursorsOptions = [{
                type: CursorType.Standard,
                color: this.EngravingRules.DefaultColorCursor,
                alpha: 0.5,
                follow: true
            }];
        }
        if (options.preferredSkyBottomLineBatchCalculatorBackend !== undefined) {
            this.rules.PreferredSkyBottomLineBatchCalculatorBackend = options.preferredSkyBottomLineBatchCalculatorBackend;
        }
        if (options.skyBottomLineBatchMinMeasures !== undefined) {
            this.rules.SkyBottomLineBatchMinMeasures = options.skyBottomLineBatchMinMeasures;
        }
    }

    public setColoringMode(options: IOSMDOptions): void {
        if (options.coloringMode === ColoringModes.XML) {
            this.rules.ColoringMode = ColoringModes.XML;
            return;
        }
        const noteIndices: NoteEnum[] = [NoteEnum.C, NoteEnum.D, NoteEnum.E, NoteEnum.F, NoteEnum.G, NoteEnum.A, NoteEnum.B];
        let colorSetString: string[];
        if (options.coloringMode === ColoringModes.CustomColorSet) {
            if (!options.coloringSetCustom || options.coloringSetCustom.length !== 8) {
                throw new Error("Invalid amount of colors: With coloringModes.customColorSet, " +
                    "you have to provide a coloringSetCustom parameter (array) with 8 strings (C to B, rest note).");
            }
            // validate strings input
            for (const colorString of options.coloringSetCustom) {
                const regExp: RegExp = /^\#[0-9a-fA-F]{6}$/;
                if (!regExp.test(colorString)) {
                    throw new Error(
                        "One of the color strings in options.coloringSetCustom was not a valid HTML Hex color:\n" + colorString);
                }
            }
            colorSetString = options.coloringSetCustom;
        } else if (options.coloringMode === ColoringModes.AutoColoring) {
            colorSetString = [];
            const keys: string[] = Object.keys(AutoColorSet);
            for (let i: number = 0; i < keys.length; i++) {
                colorSetString.push(AutoColorSet[keys[i]]);
            }
        } // for both cases:
        const coloringSetCurrent: Dictionary<NoteEnum | number, string> = new Dictionary<NoteEnum | number, string>();
        for (let i: number = 0; i < noteIndices.length; i++) {
            coloringSetCurrent.setValue(noteIndices[i], colorSetString[i]);
        }
        coloringSetCurrent.setValue(-1, colorSetString.last()); // index 7. Unfortunately -1 is not a NoteEnum value, so we can't put it into noteIndices
        this.rules.ColoringSetCurrent = coloringSetCurrent;
        this.rules.ColoringMode = options.coloringMode;
    }

    /**
     * Sets the logging level for this OSMD instance. By default, this is set to `warn`.
     *
     * @param: content can be `trace`, `debug`, `info`, `warn` or `error`.
     */
    public setLogLevel(level: string): void {
        switch (level) {
            case "trace":
                log.setLevel(log.levels.TRACE);
                break;
            case "debug":
                log.setLevel(log.levels.DEBUG);
                break;
            case "info":
                log.setLevel(log.levels.INFO);
                break;
            case "warn":
                log.setLevel(log.levels.WARN);
                break;
            case "error":
                log.setLevel(log.levels.ERROR);
                break;
            case "silent":
                log.setLevel(log.levels.SILENT);
                break;
            default:
                log.warn(`Could not set log level to ${level}. Using warn instead.`);
                log.setLevel(log.levels.WARN);
                break;
        }
    }

    public getLogLevel(): number {
        return log.getLevel();
    }

    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    protected reset(): void {
        if (this.drawingParameters.drawCursors) {
            this.cursors.forEach(cursor => {
                cursor.hide();
            });
        }
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.rules.RenderCount = 0;
    }

    /**
     * Attach the appropriate handler to the window.onResize event
     */
    protected autoResize(): void {

        const self: OpenSheetMusicDisplay = this;
        this.handleResize(
            () => {
                // empty
            },
            () => {
                // The following code is probably not needed
                // (the width should adapt itself to the max allowed)
                //let width: number = Math.max(
                //    document.documentElement.clientWidth,
                //    document.body.scrollWidth,
                //    document.documentElement.scrollWidth,
                //    document.body.offsetWidth,
                //    document.documentElement.offsetWidth
                //);
                //self.container.style.width = width + "px";

                // recalculate beams, are otherwise not updated and can detach from stems, see #724
                if (this.graphic?.GetCalculator instanceof VexFlowMusicSheetCalculator) { // null and type check
                    (this.graphic.GetCalculator as VexFlowMusicSheetCalculator).beamsNeedUpdate = true;
                }
                if (self.IsReadyToRender()) {
                    self.renderAndScrollBack(); // just calling render() will scroll to the top of the page
                }
            }
        );
    }

    /** Re-render and scroll back to previous scroll bar y position in percent.
     * If the document keeps the same height/length, the scroll bar position will basically be unchanged.
     * For example, if you scroll to the bottom of the page, resize by one pixel (or enable dark mode) and call this,
     *   for the human eye there will be no detectable scrolling or change in the scroll position at all.
     * If you just call render() instead of renderAndScrollBack(),
     *   it will scroll you back to the top of the page, even if you were scrolled to the bottom before. */
    public renderAndScrollBack(): void {
        const previousScrollY: number = window.scrollY;
        const previousScrollHeight: number = document.body.scrollHeight; // height of page
        const previousScrollYPercent: number = previousScrollY / previousScrollHeight;
        this.render();
        const newScrollHeight: number = document.body.scrollHeight; // height of page
        const newScrollY: number = newScrollHeight * previousScrollYPercent;
        window.scrollTo({
            top: newScrollY,
            behavior: "instant" // visually, there is no change in the scroll bar position, as it's the same as before.
        });
    }

    /**
     * Helper function for managing window's onResize events
     * @param startCallback is the function called when resizing starts
     * @param endCallback is the function called when resizing (kind-of) ends
     */
    protected handleResize(startCallback: () => void, endCallback: () => void): void {
        let rtime: number;
        let timeout: number = undefined;
        const delta: number = 200;
        const self: OpenSheetMusicDisplay = this;

        function resizeStart(): void {
            if (!self.AutoResizeEnabled) {
                return;
            }
            rtime = (new Date()).getTime();
            if (!timeout) {
                startCallback();
                rtime = (new Date()).getTime();
                timeout = window.setTimeout(resizeEnd, delta);
            }
        }

        function resizeEnd(): void {
            timeout = undefined;
            window.clearTimeout(timeout);
            if ((new Date()).getTime() - rtime < delta) {
                timeout = window.setTimeout(resizeEnd, delta);
            } else {
                endCallback();
            }
        }

        if ((<any>window).attachEvent) {
            // Support IE<9
            (<any>window).attachEvent("onresize", resizeStart);
        } else {
            window.addEventListener("resize", resizeStart);
        }
        this.resizeHandlerAttached = true;

        window.setTimeout(startCallback, 0);
        window.setTimeout(endCallback, 1);
    }

    /** Enable or disable (hide) the cursor.
     * @param enable whether to enable (true) or disable (false) the cursor
     */
    public enableOrDisableCursors(enable: boolean): void {
        this.drawingParameters.drawCursors = enable;
        if (enable) {
            for (let i: number = 0; i < this.cursorsOptions.length; i++){
                // save previous cursor state
                const hidden: boolean = this.cursors[i]?.Hidden ?? true;
                const previousIterator: MusicPartManagerIterator = this.cursors[i]?.Iterator;
                this.cursors[i]?.hide();

                // check which page/backend to draw the cursor on (the pages may have changed since last cursor)
                let backendToDrawOn: VexFlowBackend = this.drawer?.Backends[0];
                if (backendToDrawOn && this.rules.RestoreCursorAfterRerender && this.cursors[i]) {
                    const newPageNumber: number = this.cursors[i].updateCurrentPage();
                    backendToDrawOn = this.drawer.Backends[newPageNumber - 1];
                }
                // create new cursor
                if (backendToDrawOn && backendToDrawOn.getRenderElement()) {
                    this.cursors[i] = new Cursor(backendToDrawOn.getRenderElement(), this, this.cursorsOptions[i]);
                }
                if (this.sheet && this.graphic && this.cursors[i]) { // else init is called in load()
                    this.cursors[i].init(this.sheet.MusicPartManager, this.graphic);
                }

                // restore old cursor state
                if (this.rules.RestoreCursorAfterRerender) {
                    this.cursors[i].hidden = hidden;
                    if (previousIterator) {
                        this.cursors[i].iterator = previousIterator;
                        this.cursors[i].update();
                    }
                }
            }
        } else { // disable cursor
            this.cursors.forEach(cursor => {
                cursor.hide();
            });
            // this.cursor = undefined;
            // TODO cursor should be disabled, not just hidden. otherwise user can just call osmd.cursor.hide().
            // however, this could cause null calls (cursor.next() etc), maybe that needs some solution.
        }
    }

    public createBackend(type: BackendType, page: GraphicalMusicPage): VexFlowBackend {
        let backend: VexFlowBackend;
        if (type === undefined || type === BackendType.SVG) {
            backend = new SvgVexFlowBackend(this.rules);
        } else {
            backend = new CanvasVexFlowBackend(this.rules);
        }
        backend.graphicalMusicPage = page; // the page the backend renders on. needed to identify DOM element to extract image/SVG
        backend.initialize(this.container, this.zoom);
        //backend.getContext().setFillStyle(this.rules.DefaultColorMusic);
        //backend.getContext().setStrokeStyle(this.rules.DefaultColorMusic);
        // color needs to be set after resize() for CanvasBackend
        return backend;
    }

    /** Standard page format options like A4 or Letter, in portrait and landscape. E.g. PageFormatStandards["A4_P"] or PageFormatStandards["Letter_L"]. */
    public static PageFormatStandards: { [type: string]: PageFormat } = {
        "A3_L": new PageFormat(420, 297, "A3_L"), // id strings should use underscores instead of white spaces to facilitate use as URL parameters.
        "A3_P": new PageFormat(297, 420, "A3_P"),
        "A4_L": new PageFormat(297, 210, "A4_L"),
        "A4_P": new PageFormat(210, 297, "A4_P"),
        "A5_L": new PageFormat(210, 148, "A5_L"),
        "A5_P": new PageFormat(148, 210, "A5_P"),
        "A6_L": new PageFormat(148, 105, "A6_L"),
        "A6_P": new PageFormat(105, 148, "A6_P"),
        "Endless": PageFormat.UndefinedPageFormat,
        "Letter_L": new PageFormat(279.4, 215.9, "Letter_L"),
        "Letter_P": new PageFormat(215.9, 279.4, "Letter_P")
    };

    public static StringToPageFormat(pageFormatString: string): PageFormat {
        let pageFormat: PageFormat = PageFormat.UndefinedPageFormat; // default: 'endless' page height, take canvas/container width

        // check for widthxheight parameter, e.g. "800x600"
        if (pageFormatString.match("^[0-9]+x[0-9]+$")) {
            const widthAndHeight: string[] = pageFormatString.split("x");
            const width: number = Number.parseInt(widthAndHeight[0], 10);
            const height: number = Number.parseInt(widthAndHeight[1], 10);
            if (width > 0 && width < 32768 && height > 0 && height < 32768) {
                pageFormat = new PageFormat(width, height, `customPageFormat${pageFormatString}`);
            }
        }

        // check for formatId from OpenSheetMusicDisplay.PageFormatStandards
        pageFormatString = pageFormatString.replace(" ", "_");
        pageFormatString = pageFormatString.replace("Landscape", "L");
        pageFormatString = pageFormatString.replace("Portrait", "P");
        //console.log("change format to: " + formatId);
        if (OpenSheetMusicDisplay.PageFormatStandards.hasOwnProperty(pageFormatString)) {
            pageFormat = OpenSheetMusicDisplay.PageFormatStandards[pageFormatString];
            return pageFormat;
        }
        return pageFormat;
    }

    /** Sets page format by string. Used by setOptions({pageFormat: "A4_P"}) for example. */
    public setPageFormat(formatId: string): void {
        const newPageFormat: PageFormat = OpenSheetMusicDisplay.StringToPageFormat(formatId);
        this.needBackendUpdate = !(newPageFormat.Equals(this.rules.PageFormat));
        this.rules.PageFormat = newPageFormat;
    }

    public setCustomPageFormat(width: number, height: number): void {
        if (width > 0 && height > 0) {
            const f: PageFormat = new PageFormat(width, height);
            this.rules.PageFormat = f;
        }
    }

    //#region GETTER / SETTER
    public set DrawSkyLine(value: boolean) {
        this.drawSkyLine = value;
        if (this.drawer) {
            this.drawer.skyLineVisible = value;
            // this.render(); // note: we probably shouldn't automatically render when someone sets the setter
            //   this can cause a lot of rendering time.
        }
    }
    public get DrawSkyLine(): boolean {
        return this.drawer.skyLineVisible;
    }

    public set DrawBottomLine(value: boolean) {
        this.drawBottomLine = value;
        if (this.drawer) {
            this.drawer.bottomLineVisible = value;
            // this.render(); // note: we probably shouldn't automatically render when someone sets the setter
            //   this can cause a lot of rendering time.
        }
    }
    public get DrawBottomLine(): boolean {
        return this.drawer.bottomLineVisible;
    }
    public set DrawBoundingBox(value: string) {
        this.setDrawBoundingBox(value, true);
    }
    public get DrawBoundingBox(): string {
        return this.drawBoundingBox;
    }
    public setDrawBoundingBox(value: string, render: boolean = false): void {
        this.drawBoundingBox = value;
        if (this.drawer) {
            this.drawer.drawableBoundingBoxElement = value; // drawer is sometimes created anew, losing this value, so it's saved in OSMD now.
        }
        if (render) {
            this.renderAndScrollBack(); // may create new Drawer.
        }
    }

    public get AutoResizeEnabled(): boolean {
        return this.autoResizeEnabled;
    }
    public set AutoResizeEnabled(value: boolean) {
        this.autoResizeEnabled = value;
    }

    public get Zoom(): number {
        return this.zoom;
    }
    public set Zoom(value: number) {
        this.zoom = value;
        this.zoomUpdated = true;
        if (this.graphic?.GetCalculator instanceof VexFlowMusicSheetCalculator) { // null and type check
            (this.graphic.GetCalculator as VexFlowMusicSheetCalculator).beamsNeedUpdate = this.zoomUpdated;
        }
    }

    public set FollowCursor(value: boolean) {
        this.followCursor = value;
    }

    public get FollowCursor(): boolean {
        return this.followCursor;
    }

    public set TransposeCalculator(calculator: ITransposeCalculator) {
        MusicSheetCalculator.transposeCalculator = calculator;
    }

    public get TransposeCalculator(): ITransposeCalculator {
        return MusicSheetCalculator.transposeCalculator;
    }

    public get Sheet(): MusicSheet {
        return this.sheet;
    }
    public get Drawer(): VexFlowMusicSheetDrawer {
        return this.drawer;
    }
    public get GraphicSheet(): GraphicalMusicSheet {
        return this.graphic;
    }
    public get DrawingParameters(): DrawingParameters {
        return this.drawingParameters;
    }
    public get EngravingRules(): EngravingRules { // custom getter, useful for engraving parameter setting in Demo
        return this.rules;
    }
    /** Returns the version of OSMD this object is built from (the version you are using). */
    public get Version(): string {
        return this.version;
    }
    //#endregion
}
