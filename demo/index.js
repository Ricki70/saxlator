import { OpenSheetMusicDisplay } from '../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay';
import { BackendType } from '../src/OpenSheetMusicDisplay/OSMDOptions';
import * as jsPDF  from '../node_modules/jspdf/dist/jspdf.es.min';
import * as svg2pdf from '../node_modules/svg2pdf.js/dist/svg2pdf.umd.min';
import { TransposeCalculator } from '../src/Plugins/Transpose/TransposeCalculator';
import "./demo.css";

/*jslint browser:true */
(function () {
    "use strict";

    var openSheetMusicDisplay;
    var sampleFolder = "",
        samples = {
            "PRUEBACOMPLETA.musicxml": "PRUEBACOMPLETA.musicxml",
            "Beethoven, L.v. - An die ferne Geliebte": "Beethoven_AnDieFerneGeliebte.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.1": "MuzioClementi_SonatinaOpus36No1_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.1 Pt.2": "MuzioClementi_SonatinaOpus36No1_Part2.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.1": "MuzioClementi_SonatinaOpus36No3_Part1.xml",
            "Clementi, M. - Sonatina Op.36 No.3 Pt.2": "MuzioClementi_SonatinaOpus36No3_Part2.xml",
            "Bach, J.S. - Praeludium in C-Dur BWV846 1": "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
            "Bach, J.S. - Air": "JohannSebastianBach_Air.xml",
            "Gounod, C. - Méditation": "CharlesGounod_Meditation.xml",
            "Haydn, J. - Concertante Cello": "JosephHaydn_ConcertanteCello.xml",
            "Joplin, S. - Elite Syncopations": "ScottJoplin_EliteSyncopations.xml",
            "Joplin, S. - The Entertainer": "ScottJoplin_The_Entertainer.xml",
            "Mozart, W.A. - An Chloe": "Mozart_AnChloe.xml",
            "Mozart, W.A. - Das Veilchen": "Mozart_DasVeilchen.xml",
            "Mozart, W.A. - Clarinet Quintet (Excerpt)": "Mozart_Clarinet_Quintet_Excerpt.mxl",
            "Mozart, W.A. - String Quartet in G, K. 387, 1st Mvmt Excerpt": "Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml",
            "Mozart/Holzer - Land der Berge (national anthem of Austria)": "Land_der_Berge.musicxml",
            "OSMD Function Test - All": "OSMD_function_test_all.xml",
            "OSMD Function Test - Accidentals": "OSMD_function_test_accidentals.musicxml",
            "OSMD Function Test - Autobeam": "OSMD_function_test_autobeam.musicxml",
            "OSMD Function Test - Auto-/Custom-Coloring": "OSMD_function_test_auto-custom-coloring-entchen.musicxml",
            "OSMD Function Test - Bar lines": "OSMD_function_test_bar_lines.musicxml",
            "OSMD Function Test - Chord Symbols": "OSMD_function_test_chord_symbols.musicxml",
            "OSMD Function Test - Chord Spacing": "OSMD_function_test_chord_spacing.mxl",
            "OSMD Function Test - Chord Symbols - Various Chords": "OSMD_function_test_chord_tests_various.musicxml",
            "OSMD Function Test - Chord Symbols - BrookeWestSample": "BrookeWestSample.mxl",
            "OSMD Function Test - Color (from XML)": "OSMD_function_test_color.musicxml",
            "OSMD Function Test - Container height (compacttight mode)": "OSMD_Function_Test_Container_height.musicxml",
            "OSMD Function Test - Drumset": "OSMD_function_test_drumset.musicxml",
            "OSMD Function Test - Drums on one Line": "OSMD_Function_Test_Drums_one_line_snare_plus_piano.musicxml", 
            "OSMD Function Test - Expressions": "OSMD_function_test_expressions.musicxml",
            "OSMD Function Test - Expressions Overlap": "OSMD_function_test_expressions_overlap.musicxml",
            "OSMD Function Test - Grace Notes": "OSMD_function_test_GraceNotes.xml",
            "OSMD Function Test - Metronome Marks": "OSMD_function_test_metronome_marks.mxl",
            "OSMD Function Test - Multiple Rest Measures": "OSMD_function_test_multiple_rest_measures.musicxml",
            "OSMD Function Test - Invisible Notes": "OSMD_function_test_invisible_notes.musicxml",
            "OSMD Function Test - Notehead Shapes": "OSMD_function_test_noteheadShapes.musicxml",
            "OSMD Function Test - Ornaments": "OSMD_function_test_Ornaments.xml",
            "OSMD Function Test - Pedals": "OSMD_Function_Test_Pedals.musicxml",
            "OSMD Function Test - Selecting Measures To Draw": "OSMD_function_test_measuresToDraw_Beethoven_AnDieFerneGeliebte.xml",
            "OSMD Function Test - System and Page Breaks": "OSMD_Function_Test_System_and_Page_Breaks_4_pages.mxl",
            "OSMD Function Test - Tabulature": "OSMD_Function_Test_Tabulature_hayden_study_1.mxl",
            "OSMD Function Test - Tabulature MultiBends": "OSMD_Function_Test_Tablature_Multibends.musicxml",
            "OSMD Function Test - Tabulature All Effects": "OSMD_Function_Test_Tablature_Alleffects.musicxml",
            "OSMD Function Test - Tremolo": "OSMD_Function_Test_Tremolo_2bars.musicxml",
            "OSMD Function Test - Labels": "OSMD_Function_Test_Labels.musicxml",
            "OSMD Function Test - High Slur Test": "test_slurs_highNotes.musicxml",
            "OSMD Function Test - Auto Multirest Measures Single Staff": "Test_Auto_Multirest_1.musicxml",
            "OSMD Function Test - Auto Multirest Measures Multiple Staves": "Test_Auto_Multirest_2.musicxml",
            "OSMD Function Test - String number collisions": "test_string_number_collisions.musicxml",
            "OSMD Function Test - Repeat Stave Connectors": "OSMD_function_Test_Repeat.musicxml",
            "OSMD Function Test - Voice Alignment": "OSMD_Function_Test_Voice_Alignment.musicxml",
            "Schubert, F. - An Die Musik": "Schubert_An_die_Musik.xml",
            "Actor, L. - Prelude (Large Sample, loading time)": "ActorPreludeSample.xml",
            "Actor, L. - Prelude (Large, No Print Part Names)": "ActorPreludeSample_PartName.xml",
            "Anonymous - Saltarello": "Saltarello.mxl",
            "Debussy, C. - Mandoline": "Debussy_Mandoline.xml",
            "Levasseur, F. - Parlez Mois": "Parlez-moi.mxl",
            "Schumann, R. - Dichterliebe": "Dichterliebe01.xml",
            "Telemann, G.P. - Sonate-Nr.1.1-Dolce": "TelemannWV40.102_Sonate-Nr.1.1-Dolce.xml",
            "Telemann, G.P. - Sonate-Nr.1.2-Allegro": "TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml",
            "test.musicxml": "test.musicxml",
            "prueba.mxl": "prueba.mxl",
        },

        zoom = 1.0,
        // HTML Elements in the page
        divControls,
        zoomControls,
        zoomControlsButtons,
        header,
        err,
        error_tr,
        canvas,
        selectSample,
        selectBounding,
        skylineDebug,
        bottomlineDebug,
        zoomIns,
        zoomOuts,
        zoomDivs,
        custom,
        previousCursorBtn,
        nextCursorBtn,
        resetCursorBtn,
        followCursorCheckbox,
        showCursorBtn,
        hideCursorBtn,
        backendSelect,
        backendSelectDiv,
        debugReRenderBtn,
        debugClearBtn,
        selectPageSizes,
        printPdfBtns,
        darkModeBtn,
        transpose,
        transposeBtn,
        versionDiv;
    
    // manage option setting and resetting for specific samples, e.g. in the autobeam sample autobeam is set to true, otherwise reset to previous state
    // TODO design a more elegant option state saving & restoring system, though that requires saving the options state in OSMD
    var minMeasureToDrawStashed = 1;
    var maxMeasureToDrawStashed = Number.MAX_SAFE_INTEGER;
    var measureToDrawRangeNeedsReset = false;
    var drawingParametersStashed = "default";
    var drawingParametersNeedsReset = false;
    var autobeamOptionNeedsReset = false;
    var autobeamOptionStashedValue = false;
    var autoCustomColoringOptionNeedsReset = false;
    var autoCustomColoringOptionStashedValue = false;
    var drawPartNamesOptionStashedValue = true;
    var drawPartAbbreviationsStashedValue = true;
    var drawPartNamesOptionNeedsReset = false;
    var pageBreaksOptionStashedValue = false;
    var pageBreaksOptionNeedsReset = false;
    var systemBreaksOptionStashedValue = false; // reset handled by pageBreaksOptionNeedsReset

    var showControls = true;
    var showExportPdfControl = false;
    var showPageFormatControl = false;
    var showZoomControl = true;
    var showHeader = true;
    var showDebugControls = false;

    document.title = "Saxlator";


// ✅ Variable global correctamente declarada
let notes = [];

const imageWidth = 21.43;
const imageHeight = 74.60;

const noteToImageMap = {
  // OCTAVA 2
  "C|1|2": "1dososreb.png",
  "D|-1|2": "1dososreb.png",
  "D|0|2": "1re.png",
  "D|1|2": "1resosmib.png",
  "E|-1|2": "1resosmib.png",
  "E|0|2": "1mi.png",
  "F|0|2": "1fa.png",
  "F|1|2": "1fasossolb.png",
  "G|-1|2": "1fasossolb.png",
  "G|0|2": "1sol.png",
  "G|1|2": "1solsoslab.png",
  "A|-1|2": "1solsoslab.png",
  "A|0|2": "1la.png",
  "B|0|2": "1si.png",
  "A|1|2": "1dososreb.png",

  // OCTAVA 3
  "C|0|3": "2do.png",
  "C|1|3": "2dososreb.png",
  "D|-1|3": "2dososreb.png",
  "D|0|3": "2re.png",
  "D|1|3": "2resosmib.png",
  "E|-1|3": "2resosmib.png",
  "E|0|3": "2mi.png",
  "F|0|3": "2fa.png",
  "F|1|3": "2fasossolb.png",
  "G|-1|3": "2fasossolb.png",
  "G|0|3": "2sol.png",
  "G|1|3": "2solsoslab.png",
  "A|-1|3": "2solsoslab.png",
  "A|0|3": "2la.png",
  "A|1|3": "2lasossib.png",
  "B|-1|3": "2lasossib.png",
  "B|0|3": "2si.png",

  // OCTAVA 4
  "C|0|4": "3do.png",
  "C|1|4": "3dososreb.png",
  "D|-1|4": "3dososreb.png",
  "D|0|4": "3re.png",
  "D|1|4": "3resosmib.png",
  "E|-1|4": "3resosmib.png",
  "E|0|4": "3mi.png",
  "F|0|4": "3fa.png",
  "F|1|4": "3fasossolb.png",
  "G|-1|4": "3fasossolb.png",
  "G|0|4": "3sol.png",
  "G|1|4": "3solsoslab.png",
  "A|-1|4": "3solsoslab.png",
  "A|0|4": "3la.png",
  "A|1|4": "3lasossib.png",
  "B|-1|4": "3lasossib.png",
  "B|0|4": "3si.png",

  // OCTAVA 5
  "C|0|5": "4do.png",
  "C|1|5": "4dososreb.png",
  "D|-1|5": "4dososreb.png",
  "D|0|5": "4re.png",
  "D|1|5": "4resosmib.png",
  "E|-1|5": "4resosmib.png",
  "E|0|5": "4mi.png",
  "F|0|5": "4fa.png",
  "F|1|5": "4fasossolb.png",
  "G|-1|5": "4fasossolb.png",
  "G|0|5": "4sol.png",
};


// Función auxiliar para obtener la ruta de imagen a partir de step, alter y octave
function getImageForNote(step, alter, octave) {
  const transposedOctave = octave - 2;
  const key = `${step}|${alter}|${transposedOctave}`;
  return noteToImageMap[key] || null;
}

    window.addEventListener("drop", function (event) {
        event.preventDefault();

        if (!event.dataTransfer || !event.dataTransfer.files || event.dataTransfer.files.length === 0) {
            return;
        }

        const file = event.dataTransfer.files[0];
        const filename = file.name.toLowerCase();

        // Add "Custom..." score
        selectSample.appendChild(custom);
        custom.selected = "selected";

        const reader = new FileReader();

        reader.onload = function (res) {
            const text = res.target.result;

            // 1. Cargar en OSMD como siempre
            selectSampleOnChange(text);

            // 2. Extraer notas usando función reutilizable
            try {
                extractNotesFromXMLText(text);
            } catch (err) {
                console.error("❌ Error al analizar el fichero XML:", err);
            }
        };

        if (filename.endsWith(".xml") || filename.endsWith(".musicxml")) {
            reader.readAsText(file);
        } else if (filename.endsWith(".mxl")) {
            reader.readAsBinaryString(file);
        } else {
            alert("No válido: solo se aceptan archivos .xml, .musicxml o .mxl");
        }
    });


document.getElementById("fileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filename = file.name.toLowerCase();

    // Add "Custom..." score
    selectSample.appendChild(custom);
    custom.selected = "selected";

    const reader = new FileReader();

    reader.onload = function (res) {
        const text = res.target.result;

        // 1. Cargar en OSMD como siempre
        selectSampleOnChange(text);

        // 2. Extraer notas
        try {
            extractNotesFromXMLText(text);
        } catch (err) {
            console.error("❌ Error al analizar el fichero XML:", err);
        }
    };

    if (filename.endsWith(".xml") || filename.endsWith(".musicxml")) {
        reader.readAsText(file);
    } else if (filename.endsWith(".mxl")) {
        reader.readAsBinaryString(file);
    } else {
        alert("No válido: solo se aceptan archivos .xml, .musicxml o .mxl");
    }
});

document.getElementById("export-notes-pdf-btn").addEventListener("click", async () => {
  const notes = window.extractedNotes || [];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // Extraer título y autor desde el XML si está disponible
  let title = "Partitura sin título";
  let author = "Autor desconocido";

  try {
    const osmdXml = window.lastParsedXML || null;
    if (osmdXml) {
      const titleNode = osmdXml.querySelector("work > work-title");
      const authorNode = osmdXml.querySelector("identification > creator[type='composer']");
      if (titleNode && titleNode.textContent.trim()) {
        title = titleNode.textContent.trim();
      }
      if (authorNode && authorNode.textContent.trim()) {
        author = authorNode.textContent.trim();
      }
    }
  } catch (err) {
    console.warn("No se pudo extraer título/autor del XML:", err);
  }

  // Página de portada
  doc.setFontSize(24);
  doc.text(title, pageWidth / 2, 80, { align: "center" });
  doc.setFontSize(16);
  doc.text(`Autor: ${author}`, pageWidth / 2, 100, { align: "center" });

  doc.addPage(); // Página nueva para imágenes

  // Configuración de imágenes
  let x = margin;
  let y = margin;

  const imageWidth = 21.43;
  const imageHeight = 74.60;
  const pageHeight = doc.internal.pageSize.getHeight();

let currentMeasure = null;

for (let i = 0; i < notes.length; i++) {
  const { step, alter, octave, measure } = notes[i];

  // Separador entre compases
  if (measure !== currentMeasure && currentMeasure !== null) {
    const sepX = x;
    const sepY = y;
    const sepHeight = imageHeight;

    doc.setFontSize(20);
    doc.text("|", sepX + 2, sepY + sepHeight / 2, { align: "left", baseline: "middle" });

    x += 8;
  }

  currentMeasure = measure;

  const imageName = getImageForNote(step, alter, octave);
  const imagePath = imageName ? `/resources/digitaciones/${imageName}` : null;

  try {
    if (!imagePath) throw new Error("Imagen no definida");

    const imgData = await loadImageAsBase64(imagePath);
    doc.addImage(imgData, "PNG", x, y, imageWidth, imageHeight);
  } catch (err) {
    console.warn(`❌ Imagen no cargada para nota: ${step}|${alter}|${octave}`, err);
    
    // Inserta un punto en su lugar
    doc.setFontSize(20);
    doc.text(".", x + imageWidth / 2, y + imageHeight / 2, { align: "center", baseline: "middle" });
  }

  x += imageWidth + 5;

  if (x + imageWidth + margin > pageWidth) {
    x = margin;
    y += imageHeight + 10;

    if (y + imageHeight + margin > pageHeight) {
      doc.addPage();
      x = margin;
      y = margin;
    }
  }
}

const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
const safeAuthor = author.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
const filename = `${safeTitle} - ${safeAuthor} - altosax.pdf`;
doc.save(filename);
});


// Utilidad para cargar una imagen como Base64
async function loadImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar imagen: ${url}`);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}


function extractNotesFromXMLText(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");
  window.lastParsedXML = xmlDoc;

  const notes = [];
  xmlDoc.querySelectorAll("measure").forEach((measure, measureIndex) => {
    const measureNumber = measure.getAttribute("number") || (measureIndex + 1);
    measure.querySelectorAll("note").forEach(note => {
      if (note.querySelector("rest")) return;
      const step = note.querySelector("step")?.textContent.trim();
      const alter = note.querySelector("alter")?.textContent?.trim() || "0";
      const octave = note.querySelector("octave")?.textContent?.trim();
      if (!step || !octave) return;
      notes.push({ step, alter, octave, measure: parseInt(measureNumber) });
    });
  });

  window.extractedNotes = notes;
}


// Initialization code
    function init() {
        var name, option;

        // Handle window parameter
        var paramEmbedded = findGetParameter('embedded');
        var paramShowControls = findGetParameter('showControls');
        var paramShowPageFormatControl = findGetParameter('showPageFormatControl');
        var paramShowExportPdfControl = findGetParameter('showExportPdfControl');
        var paramShowZoomControl = findGetParameter('showZoomControl');
        var paramShowHeader = findGetParameter('showHeader');
        var paramZoom = findGetParameter('zoom');
        var paramOverflow = findGetParameter('overflow');
        var paramDarkMode = findGetParameter('darkMode');
        var paramOpenUrl = findGetParameter('openUrl');
        var paramDebugControls = findGetParameter('debugControls');

        var paramCompactMode = findGetParameter('compactMode');
        var paramMeasureRangeStart = findGetParameter('measureRangeStart');
        var paramMeasureRangeEnd = findGetParameter('measureRangeEnd');
        var paramPageFormat = findGetParameter('pageFormat');
        var paramPageBackgroundColor = findGetParameter('pageBackgroundColor');
        var paramBackendType = findGetParameter('backendType');
        var paramPageWidth = findGetParameter('pageWidth');
        var paramPageHeight = findGetParameter('pageHeight');

        var paramHorizontalScrolling = findGetParameter('horizontalScrolling');
        var paramSingleHorizontalStaffline = findGetParameter('singleHorizontalStaffline');

        showHeader = (paramShowHeader !== '0');
        showControls = false;
        if (paramEmbedded) {
            showControls = paramShowControls !== '0';
            showZoomControl = paramShowZoomControl !== '0';
            showPageFormatControl = paramShowPageFormatControl !== '0';
            showExportPdfControl = paramShowExportPdfControl !== '0';
        }

        if (paramZoom) {
            if (paramZoom > 0.1 && paramZoom < 5.0) {
                zoom = paramZoom;
            }
        }
        if (paramOverflow && typeof paramOverflow === 'string') {
            if (paramOverflow === 'hidden' || paramOverflow === 'auto' || paramOverflow === 'scroll' || paramOverflow === 'visible') {
                document.body.style.overflow = paramOverflow;
            }
        }
        
        var compactMode = paramCompactMode && paramCompactMode !== '0';
        var measureRangeStart = paramMeasureRangeStart ? Number.parseInt(paramMeasureRangeStart) : 0;
        var measureRangeEnd = paramMeasureRangeEnd ? Number.parseInt(paramMeasureRangeEnd) : Number.MAX_SAFE_INTEGER;
        if (measureRangeStart && measureRangeEnd && measureRangeEnd < measureRangeStart) {
            console.log("[OSMD] warning: measure range end parameter should not be smaller than measure range start. We've set start measure = end measure now.")
            measureRangeStart = measureRangeEnd;
        }
        let pageFormat = paramPageFormat ? paramPageFormat : "Endless";
        if (paramPageHeight && paramPageWidth) {
            pageFormat = `${paramPageWidth}x${paramPageHeight}`
        }
        var pageBackgroundColor = paramPageBackgroundColor ? "%23" + paramPageBackgroundColor : undefined; // vexflow format, see OSMDOptions. can't use sos in parameters.
        //console.log("demo: osmd pagebgcolor: " + pageBackgroundColor);
        var backendType = (paramBackendType && paramBackendType.toLowerCase) ? paramBackendType : "svg";

        var horizontalScrolling = paramHorizontalScrolling === '1';
        var singleHorizontalStaffline = paramSingleHorizontalStaffline === '1';
        
        // set the backendSelect debug controls dropdown menu selected item
        //console.log("true: " + backendSelect && backendType.toLowerCase && backendType.toLowerCase() === "canvas");
        // TODO somehow backendSelect becomes undefined here:
        /*if (backendSelect && backendType.toLowerCase && backendType.toLowerCase() === "canvas") {
            console.log("here1");
            for (var i=0; i<backendSelect.options.length; i++) {
                if (backendSelect.options[i].value.toLowerCase() === "canvas") {
                    backendSelect.selectedIndex = i;
                }
            }
            backendSelect.value = "Canvas";
        }*/

        divControls = document.getElementById('divControls');
        zoomControls = document.getElementById('zoomControls');
        header = document.getElementById('header');
        err = document.getElementById("error-td");
        error_tr = document.getElementById("error-tr");
        zoomDivs = [];
        zoomDivs.push(document.getElementById("zoom-str"));
        zoomDivs.push(document.getElementById("zoom-str-portrait"));
        zoomDivs.push(document.getElementById("zoom-str-optional"));
        custom = document.createElement("option");
        selectSample = document.getElementById("selectSample");
        selectBounding = document.getElementById("selectBounding");
        skylineDebug = document.getElementById("skylineDebug");
        bottomlineDebug = document.getElementById("bottomlineDebug");
        zoomIns = [];
        zoomIns.push(document.getElementById("zoom-in-btn"));
        zoomIns.push(document.getElementById("zoom-in-btn-optional"));
        zoomOuts = [];
        zoomOuts.push(document.getElementById("zoom-out-btn"));
        zoomOuts.push(document.getElementById("zoom-out-btn-optional"));
        canvas = document.createElement("div");
        if (horizontalScrolling) {
            canvas.style.overflowX = 'auto'; // enable horizontal scrolling
        }
        canvas.id = 'osmdCanvasDiv';
        //canvas.style.overflowX = 'auto'; // enable horizontal scrolling
        previousCursorBtn = document.getElementById("previous-cursor-btn");
        nextCursorBtn = document.getElementById("next-cursor-btn");
        resetCursorBtn = document.getElementById("reset-cursor-btn");
        followCursorCheckbox = document.getElementById("follow-cursor-checkbox");
        showCursorBtn = document.getElementById("show-cursor-btn");
        hideCursorBtn = document.getElementById("hide-cursor-btn");
        backendSelect = document.getElementById("backend-select");
        backendSelectDiv = document.getElementById("backend-select-div");
        debugReRenderBtn = document.getElementById("debug-re-render-btn");
        debugClearBtn = document.getElementById("debug-clear-btn");
        selectPageSizes = [];
        selectPageSizes.push(document.getElementById("selectPageSize"));
        selectPageSizes.push(document.getElementById("selectPageSize-optional"));
        printPdfBtns = [];
        printPdfBtns.push(document.getElementById("print-pdf-btn"));
        printPdfBtns.push(document.getElementById("print-pdf-btn-optional"));
        darkModeBtn = document.getElementById("dark-mode-btn");
        transpose = document.getElementById('transpose');
        transposeBtn = document.getElementById('transpose-btn');
        versionDiv = document.getElementById('versionDiv');
        zoomControlsButtons = document.getElementById('zoomControlsButtons')

        //var defaultDisplayVisibleValue = "block"; // TODO in some browsers flow could be the better/default value
        var defaultVisibilityValue = "visible";
        showDebugControls = paramDebugControls !== '0';
        if (showDebugControls) {
            var elementsToEnable = [
                selectSample, selectBounding, selectPageSizes[0], backendSelect, backendSelectDiv, divControls
            ];
            for (var i=0; i<elementsToEnable.length; i++) {
                if (elementsToEnable[i]) { // make sure this element is not null/exists in the index.html, e.g. github.io demo has different index.html
                    const elementToEnable = elementsToEnable[i];
                    if (elementToEnable.style) {
                        elementToEnable.style.visibility = defaultVisibilityValue;
                        if (elementToEnable.style.opacity === 0) {
                            elementToEnable.style.opacity = 1.0;
                        }
                    }
                }
            }
        } else {
            if (divControls) {
                divControls.style.display = "none";
            }
        }
        // detect mobile portrait mode (small screen -> reduce zoom etc)
        const portrait = window.matchMedia("(orientation: portrait)").matches;
        // console.log(`is portrait mode: ${portrait}`);
        if (window.outerWidth < 768) {
            zoom = 0.60; // ~60% is good for iPhone SE (browser simulated device dimensions)

            // collapsible behavior
            var coll = document.getElementsByClassName("portraitCollapsible");
            for (var i = 0; i < coll.length; i++) {
                var content = coll[i].nextElementSibling;
                content.style.display = "none";

            coll[i].addEventListener("click", function() {
                this.classList.toggle("active");
                var content = this.nextElementSibling;
                if (content.style.display === "block") {
                    content.style.display = "none";
                } else {
                    content.style.display = "block";
                }
            });
            }
            var adSetBtn = document.getElementById("advanced-settings-btn");
            
            var advSettings = document.getElementsByClassName("advanced-setting");
            for(var i = 0; i < advSettings.length; i++){
                var element = advSettings[i];
                element.style.display = "none";
            }

            if (adSetBtn) {
                adSetBtn.addEventListener("click", function() {
                    this.classList.toggle("active");
                    for(var i = 0; i < advSettings.length; i++){
                        var element = advSettings[i];
                        if (element.style.display === "block") {
                            element.style.display = "none";
                        } else {
                            element.style.display = "block";
                        }
                    }
                }); 
            }
        }

        var slideButton = document.getElementById("slideControlsButton");
        if (slideButton) {
            slideButton.onclick=function slideButtonClicked(){
                var slideContainer = document.getElementById("slideContainer");
                slideContainer.addEventListener("animationend", function(e){
                    e.preventDefault();
    
                    if(slideContainer.style.animationName == "slide-left"){
                        divControls.style.display = "block";
                    }
                });
    
                if(divControls.style.display == "block"){
                    divControls.style.display = "flex";
                    slideContainer.style.animation = "0.7s slide-right";
                    slideContainer.style.animationFillMode = "forwards"
                    slideButton.style.background = "url('resources/arrow-left-s-line.svg') 50% no-repeat var(--theme-color-light)"
                    return;
                }
                slideContainer.style.animation = "0.7s slide-left"
                slideContainer.style.animationFillMode = "forwards"
                slideButton.style.background = "url('resources/arrow-right-s-line.svg') 50% no-repeat var(--theme-color-light)"
            }
        }

        const optionalControls = document.getElementById('optionalControls');
        if (optionalControls) {
            if (showControls) {
                optionalControls.style.visibility = defaultVisibilityValue;
                optionalControls.style.opacity = 0.8;
            } else {
                optionalControls.style.display = 'none';
            }
        }

        if (!showHeader) {
            if (header) {
                header.style.display = 'none';
            }
        } else {
            if (header) {
                header.style.opacity = 1.0;
            }
        }
        // Hide error
        error();

        if (showControls) {
            const optionalControls = document.getElementById('optionalControls');
            if (optionalControls) {
                optionalControls.style.opacity = 1.0;
                // optionalControls.appendChild(zoomControlsButtons);
                // optionalControls.appendChild(zoomControlsString);
                optionalControls.style.position = 'absolute';
                optionalControls.style.zIndex = '10';
                optionalControls.style.right = '10px';
                // optionalControls.style.padding = '10px';
            }

            if (showZoomControl) {
                const zoomControlsButtonsColumn = document.getElementById('zoomControlsButtons-optional-column');
                zoomControlsButtonsColumn.style.opacity = 1.0;
                // const zoomControlsButtons = document.getElementById('zoomControlsButtons-optional');
                // zoomControlsButtons.style.opacity = 1.0;
                const zoomControlsString = document.getElementById('zoom-str-optional'); // actually === zoomDivs[1] above

                if (zoomControlsString) {
                    zoomControlsString.innerHTML = Math.floor(zoom * 100.0) + "%";
                    zoomControlsString.style.display = 'inline';
                    // zoomControlsString.style.padding = '10px';
                }
            }

            if (showExportPdfControl) {
                const exportPdfButtonColumn = document.getElementById('print-pdf-btn-optional-column');
                if (exportPdfButtonColumn) {
                    exportPdfButtonColumn.style.opacity = 1.0;
                }
            }

            const pageFormatControlColumn = document.getElementById("selectPageSize-optional-column");
            if (pageFormatControlColumn) {
                if (showPageFormatControl) {
                    pageFormatControlColumn.style.opacity = 1.0;
                } else {
                    // showPageFormatControlColumn.innerHTML = "";
                    // pageFormatControlColumn.style.minWidth = 0;
                    // pageFormatControlColumn.style.width = 0;
                    pageFormatControlColumn.style.display = 'none'; // squeezes buttons/columns
                    // pageFormatControlColumn.style.visibility = 'hidden';

                    // const optionalControlsColumnContainer = document.getElementById("optionalControlsColumnContainer");
                    // optionalControlsColumnContainer.removeChild(pageFormatControlColumn);
                    // optionalControlsColumnContainer.width *= 0.66;
                    // optionalControls.witdh *= 0.66;
                    // optionalControls.focus();
                }
            }
        }

        // Create select
        for (name in samples) {
            if (samples.hasOwnProperty(name)) {
                option = document.createElement("option");
                option.value = samples[name];
                option.textContent = name;
            }
            if (selectSample) {
                selectSample.appendChild(option);
            }
        }
        if (selectSample) {
            selectSample.onchange = selectSampleOnChange;
        }
        if (selectBounding) {
            selectBounding.onchange = selectBoundingOnChange;
        }

        for (const selectPageSize of selectPageSizes) {
            if (selectPageSize) {
                selectPageSize.onchange = function (evt) {
                    var value = evt.target.value;
                    openSheetMusicDisplay.setPageFormat(value);
                    renderAndScrollBack();
                };
            }
        }

        for (const printPdfBtn of printPdfBtns) {
            if (printPdfBtn) {
                printPdfBtn.onclick = function () {
                    createPdf();
                }
            }
        }

        if (darkModeBtn) {
            darkModeBtn.onclick = function() {
                osmd.setOptions({
                    darkMode: !osmd.EngravingRules.DarkModeEnabled // toggle to opposite of current value (on/off)
                });
                renderAndScrollBack();
            }
        }

        // Pre-select default music piece

        custom.appendChild(document.createTextNode("Custom"));

        // Create zoom controls
        for (const zoomIn of zoomIns) {
            if (zoomIn) {
                zoomIn.onclick = function () {
                    zoom *= 1.2;
                    scale();
                };
            }
        }
        for (const zoomOut of zoomOuts) {
            if (zoomOut) {
                zoomOut.onclick = function () {
                    zoom /= 1.2;
                    scale();
                };
            }
        }

        if (skylineDebug) {
            skylineDebug.onclick = function () {
                openSheetMusicDisplay.DrawSkyLine = !openSheetMusicDisplay.DrawSkyLine;
                renderAndScrollBack();
            }
        }

        if (bottomlineDebug) {
            bottomlineDebug.onclick = function () {
                openSheetMusicDisplay.DrawBottomLine = !openSheetMusicDisplay.DrawBottomLine;
                renderAndScrollBack();
            }
        }

        if (debugReRenderBtn) {
            debugReRenderBtn.onclick = function () {
                rerender();
            }
        }

        if (debugClearBtn) {
            debugClearBtn.onclick = function () {
                openSheetMusicDisplay.clear();
            }
        }

        // Create OSMD object and canvas
        openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, {
            autoResize: true,
            backend: backendType,
            //backend: "canvas",
            //cursorsOptions: [{type: 3, color: "sos2bb8cd", alpha: 0.6, follow: true}], // highlight current measure instead of just a small vertical bar over approximate notes
            disableCursor: false,
            drawingParameters: compactMode ? "compact" : "default", // try compact (instead of default)
            drawPartNames: true, // try false
            // drawTitle: false,
            // drawSubtitle: false,
            drawFingerings: true,
            //fingeringPosition: "left", // Above/Below is default. try left or right. experimental: above, below.
            //fingeringPositionFromXML: false, // do this if you want them always left, for example.
            // fingeringInsideStafflines: "true", // default: false. true draws fingerings directly above/below notes
            setWantedStemDirectionByXml: true, // try false, which was previously the default behavior
            // drawUpToMeasureNumber: 3, // draws only up to measure 3, meaning it draws measure 1 to 3 of the piece.
            drawFromMeasureNumber : measureRangeStart,
            drawUpToMeasureNumber : measureRangeEnd,

            //drawMeasureNumbers: false, // disable drawing measure numbers
            //measureNumberInterval: 4, // draw measure numbers only every 4 bars (and at the beginning of a new system)
            useXMLMeasureNumbers: true, // read measure numbers from xml

            // coloring options
            coloringEnabled: true,
            // defaultColorNotehead: "sosCC0055", // try setting a default color. default is black (undefined)
            // defaultColorStem: "sosBB0099",

            autoBeam: false, // try true, OSMD Function Test AutoBeam sample
            autoBeamOptions: {
                beam_rests: false,
                beam_middle_rests_only: false,
                //groups: [[3,4], [1,1]],
                maintain_stem_directions: false
            },
            pageFormat: pageFormat,
            pageBackgroundColor: pageBackgroundColor,
            renderSingleHorizontalStaffline: singleHorizontalStaffline

            // tupletsBracketed: true, // creates brackets for all tuplets except triplets, even when not set by xml
            // tripletsBracketed: true,
            // tupletsRatioed: true, // unconventional; renders ratios for tuplets (3:2 instead of 3 for triplets)
        });
        if (portrait) {
            // reduce title labels/text size etc. as well. E.g. for Mozart string quartet, title wouldn't fit line width otherwise
            openSheetMusicDisplay.EngravingRules.SheetTitleHeight *= 0.7; // see Mozart String Quartet
            // reducing size for subtitle/composer/lyricist is probably unnecessary and makes them too small:
            // openSheetMusicDisplay.EngravingRules.SheetSubtitleHeight *= 0.9;
            // openSheetMusicDisplay.EngravingRules.SheetComposerHeight *= 0.9;
            // openSheetMusicDisplay.EngravingRules.SheetAuthorHeight *= 0.9; // affects lyricist label, maybe should be renamed
        }
        openSheetMusicDisplay.TransposeCalculator = new TransposeCalculator(); // necessary for using osmd.Sheet.Transpose and osmd.Sheet.Instruments[i].Transpose
        //openSheetMusicDisplay.DrawSkyLine = true;
        //openSheetMusicDisplay.DrawBottomLine = true;
        //openSheetMusicDisplay.setDrawBoundingBox("GraphicalLabel", false);
        openSheetMusicDisplay.setLogLevel('info'); // set this to 'debug' if you want to see more detailed control flow information in console
        document.body.appendChild(canvas);

        if (versionDiv) {
            versionDiv.innerHTML = "OSMD Version: " + openSheetMusicDisplay.Version.replace("-release", "").replace("-dev", "");
        }

        window.addEventListener("keydown", function (e) {
            var event = window.event ? window.event : e;
            // left arrow key
            if (event.keyCode === 37) {
                openSheetMusicDisplay.cursor.previous();
            }
            // right arrow key
            if (event.keyCode === 39) {
                openSheetMusicDisplay.cursor.next();
            }
        });
        previousCursorBtn?.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.previous();
        });
        nextCursorBtn.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.next();
        });
        resetCursorBtn.addEventListener("click", function () {
            openSheetMusicDisplay.cursor.reset();
        });
        if (followCursorCheckbox) {
            followCursorCheckbox.onclick = function () {
                openSheetMusicDisplay.FollowCursor = !openSheetMusicDisplay.FollowCursor;
            }
        }
        hideCursorBtn.addEventListener("click", function () {
            if (openSheetMusicDisplay.cursor) {
                openSheetMusicDisplay.cursor.hide();
            } else {
                console.info("Can't hide cursor, as it was disabled (e.g. by drawingParameters).");
            }
        });
        showCursorBtn.addEventListener("click", function () {
            if (openSheetMusicDisplay.cursor) {
                openSheetMusicDisplay.cursor.show();
            } else {
                console.info("Can't show cursor, as it was disabled (e.g. by drawingParameters).");
            }
        });

        backendSelect.addEventListener("change", function (e) {
            var value = e.target.value;
            var createNewOsmd = true;

            if (createNewOsmd) {
                // clears the canvas element
                canvas.innerHTML = "";
                //openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas, { backend: value }); // resets EngravingRules
                openSheetMusicDisplay.setOptions({backend: value});
                openSheetMusicDisplay.setLogLevel('info'); // set this to 'debug' if you want to get more detailed control flow information
                if (openSheetMusicDisplay.graphic) {
                    openSheetMusicDisplay.renderAndScrollBack();
                }
            } else {
                // alternative, doesn't work yet, see setOptions():
                openSheetMusicDisplay.setOptions({ backend: value });
            }
            console.log("[OSMD] selectSampleOnChange addEventListener change");
            // selectSampleOnChange();
        });
        if(transposeBtn && transpose){
            transposeBtn.onclick = function(){
                var transposeValue = parseInt(transpose.value);
                openSheetMusicDisplay.Sheet.Transpose = transposeValue;
                openSheetMusicDisplay.updateGraphic();
                rerender();
            }
        }

        if (paramDarkMode) {
            openSheetMusicDisplay.setOptions({darkMode: true});
        }
        // TODO after selectSampleOnChange, the resize handler triggers immediately,
        //   so we render twice at the start of the demo.
        //   maybe delay the first osmd render, e.g. when window ready?
        if (paramOpenUrl) {
            if (openSheetMusicDisplay.getLogLevel() < 2) { // debug or trace
                console.log("[OSMD] selectSampleOnChange with " + paramOpenUrl);
            }
            // DEBUG: cause an error for a certain sample, for testing
            // if (paramOpenUrl.startsWith("Beethoven")) {
            //     paramOpenUrl.causeError();
            // }
            selectSampleOnChange(paramOpenUrl);
        } else {
            if (openSheetMusicDisplay.getLogLevel() < 2) { // debug or trace
                console.log("[OSMD] selectSampleOnChange without param");
            }
            selectSampleOnChange();
        }
    }

    /** Re-render and scroll back to previous scroll bar y position in percent.
     * If the document keeps the same height/length, the scroll bar position will basically be unchanged.
     * If you just call render() instead of renderAndScrollBack(),
     *   it will scroll you back to the top of the page, even if you were scrolled to the bottom before. */
    function renderAndScrollBack() {
        const previousScrollY = window.scrollY;
        const previousScrollHeight = document.body.scrollHeight; // height of page
        const previousScrollYPercent = previousScrollY / previousScrollHeight;
        openSheetMusicDisplay.render();
        const newScrollHeight = document.body.scrollHeight; // height of page
        const newScrollY = newScrollHeight * previousScrollYPercent;
        window.scrollTo({
            top: newScrollY,
            behavior: 'instant' // visually, there is no change in the scroll bar position, as it's the same as before.
        })
    }

    function findGetParameter(parameterName) {
        // special treatment for the openUrl parameter, because different systems attach different arguments to an URL.
        // because of CORS (cross-origin safety restrictions), you can only load an xml file from the same origin (server).

        // test parameter: ?openUrl=https://opensheetmusiceducation.org/index.php?gf-download=2020%2F01%2FJohannSebastianBach_PraeludiumInCDur_BWV846_1.xml&endUrl&form-id=1&field-id=4&hash=c4ba271ef08204a26cbd4cd2d751c53b78f238c25ddbb1f343e1172f2ce2aa53
        //   (enable the console.log at the end of this method for testing)
        // working test parameter in local demo: ?openUrl=OSMD_function_test_all.xml&endUrl
    
        if (parameterName === 'openUrl') {
            let startParameterName = 'openUrl=';
            let endParameterName = '&endUrl';
            let openUrlIndex = location.search.indexOf(startParameterName);
            if (openUrlIndex < 0) {
                return undefined;
            }
            let endIndex = location.search.indexOf(endParameterName) + endParameterName.length;
            if (endIndex < 0) {
                console.log("[OSMD] If using openUrl as a parameter, you have to end it with '&endUrl'. openUrl parameter omitted.");
                return undefined;
            }
            let urlString = location.search.substring(openUrlIndex + startParameterName.length, endIndex - endParameterName.length);
            //console.log("openUrl: " + urlString);
            return urlString;
        }

        let result = undefined;
        let tmp = [];
        location.search
            .substr(1)
            .split('&')
            .forEach(function (item) {
                tmp = item.split('=');
                if (tmp[0] === parameterName) {
                    result = decodeURIComponent(tmp[1]);
                    //console.log('Found param:' + parameterName + ' = ' + result);
                }
            });
        return result;
    }

    function selectBoundingOnChange(evt) {
        var value = evt.target.value;
        openSheetMusicDisplay.DrawBoundingBox = value;
    }

function selectSampleOnChange(str) {
    error();
    disable();
    var isCustom = typeof str === "string";
    if (!isCustom) {
        if (selectSample) {
            str = sampleFolder + selectSample.value;
        } else {
            if (samples && samples.length > 0) {
                str = sampleFolder + samples[0];
            } else {
                return; // no sample to load right now
            }
        }
    }

    openSheetMusicDisplay.load(str).then(
        function () {
            // Este bloque se ejecuta tras cargar exitosamente la partitura
            window.osmd = openSheetMusicDisplay;
            openSheetMusicDisplay.zoom = zoom;
            renderAndScrollBack();

            // ✅ Disparar extracción automática de notas a PDF
            const btnExportNotas = document.getElementById("export-notes-pdf-btn");

        },
        function (e) {
            errorLoadingOrRenderingSheet(e, "rendering");
        }
    ).then(
        function () {
            return onLoadingEnd(isCustom);
        }, function (e) {
            errorLoadingOrRenderingSheet(e, "loading");
            onLoadingEnd(isCustom);
        }
    );
}


    function setSampleSpecificOptions(str, isCustom) {
        if (!isCustom && str.includes("measuresToDraw")) { // set options for measuresToDraw sample
            // stash previously set range of measures to draw
            if (!measureToDrawRangeNeedsReset) { // only stash once, when measuresToDraw called multiple times in a row
                minMeasureToDrawStashed = openSheetMusicDisplay.EngravingRules.MinMeasureToDrawIndex + 1;
                maxMeasureToDrawStashed = openSheetMusicDisplay.EngravingRules.MaxMeasureToDrawIndex + 1;
            }
            measureToDrawRangeNeedsReset = true;

            // for debugging: draw from a random range of measures
            let minMeasureToDraw = Math.ceil(Math.random() * 15); // measures start at 1 (measureIndex = measure number - 1 elsewhere)
            let maxMeasureToDraw = Math.ceil(Math.random() * 15);
            if (minMeasureToDraw > maxMeasureToDraw) {
                minMeasureToDraw = maxMeasureToDraw;
                let a = minMeasureToDraw;
                maxMeasureToDraw = a;
            }
            //minMeasureToDraw = 1; // set your custom indexes here. Drawing only one measure can be a special case
            //maxMeasureToDraw = 1;
            console.log("drawing measures in the range: [" + minMeasureToDraw + "," + maxMeasureToDraw + "]");
            openSheetMusicDisplay.setOptions({
                drawFromMeasureNumber: minMeasureToDraw,
                drawUpToMeasureNumber: maxMeasureToDraw
            });
        } else if (measureToDrawRangeNeedsReset) { // reset for other samples
            openSheetMusicDisplay.setOptions({
                drawFromMeasureNumber: minMeasureToDrawStashed,
                drawUpToMeasureNumber: maxMeasureToDrawStashed
            });
            measureToDrawRangeNeedsReset = false;
        }

        if (!isCustom && str.includes("Test_Container_height")) {
            drawingParametersStashed = openSheetMusicDisplay.drawingParameters.drawingParametersEnum;
            openSheetMusicDisplay.setOptions({
                drawingParameters: "compacttight"
            });
            drawingParametersNeedsReset = true;
        } else if (drawingParametersNeedsReset) {
            openSheetMusicDisplay.setOptions({
                drawingParameters: drawingParametersStashed
            });
            drawingParametersNeedsReset = false;
        }

        // Enable Boomwhacker-like coloring for OSMD Function Test - Auto-Coloring (Boomwhacker-like, custom color set)
        if (!isCustom && str.includes("auto-custom-coloring")) { // set options for auto coloring sample
            autoCustomColoringOptionNeedsReset = true;
            //openSheetMusicDisplay.setOptions({coloringMode: 1}); // Auto-Coloring with pre-defined colors
            openSheetMusicDisplay.setOptions({
                coloringMode: 2, // custom coloring set. 0 would be XML, 1 autocoloring
                coloringSetCustom: ["%23d82c6b", "%23F89D15", "%23FFE21A", "%234dbd5c", "%23009D96", "%2343469d", "%2376429c", "%23ff0000"],
                // last color value of coloringSetCustom is for rest notes
                colorStemsLikeNoteheads: true
            });
        } else if (autoCustomColoringOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ // set default values. better would be to restore to stashed values, but unnecessarily complex for demo
                coloringMode: 0,
                colorStemsLikeNoteheads: false,
                coloringSetCustom: null
            });
            autoCustomColoringOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("autobeam")) {
            autobeamOptionStashedValue = openSheetMusicDisplay.EngravingRules.AutoBeamNotes; // stash previously set value, to restore later
            autobeamOptionNeedsReset = true;
            openSheetMusicDisplay.setOptions({ autoBeam: true });
        } else if (autobeamOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ autoBeam: autobeamOptionStashedValue });
            autobeamOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("OSMD_Function_Test_System_and_Page_Breaks")) {
            pageBreaksOptionStashedValue = openSheetMusicDisplay.EngravingRules.NewPageAtXMLNewPageAttribute;
            systemBreaksOptionStashedValue = openSheetMusicDisplay.EngravingRules.NewSystemAtXMLNewSystemAttribute;
            pageBreaksOptionNeedsReset = true;
            openSheetMusicDisplay.setOptions({ newPageFromXML: true, newSystemFromXML: true });
        }
        else if (pageBreaksOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ newPageFromXML: pageBreaksOptionStashedValue, newSystemFromXML: systemBreaksOptionStashedValue });
            pageBreaksOptionNeedsReset = false;
        }
        if (!isCustom && str.includes("Schubert_An_die_Musik")) { // TODO weird layout bug here with part names. but shouldn't be in score anyways
            drawPartNamesOptionStashedValue = openSheetMusicDisplay.EngravingRules.RenderPartNames;
            drawPartAbbreviationsStashedValue = openSheetMusicDisplay.EngravingRules.RenderPartAbbreviations;
            openSheetMusicDisplay.setOptions({ drawPartNames: false, drawPartAbbreviations: false }); // TODO sets osmd.drawingParameters.DrawPartNames! also check EngravingRules.RenderPartAbbreviations, was false
            drawPartNamesOptionNeedsReset = true;
        } else if (drawPartNamesOptionNeedsReset) {
            openSheetMusicDisplay.setOptions({ drawPartNames: drawPartNamesOptionStashedValue, drawPartAbbreviations: drawPartAbbreviationsStashedValue });
            drawPartNamesOptionNeedsReset = false;
        }
    }

    function errorLoadingOrRenderingSheet(e, loadingOrRenderingString) {
        var errorString = "Error " + loadingOrRenderingString + " sheet: " + e;
        // Always giving a StackTrace might give us more and better error reports.
        // TODO for a release, StackTrace control could be reenabled
        errorString += "\n" + "StackTrace: \n" + e.stack;
        // }
        console.warn(errorString);
    }

    function onLoadingEnd(isCustom) {
        // Remove option from select
        if (!isCustom && custom.parentElement === selectSample) {
            selectSample.removeChild(custom);
        }
        // Enable controls again
        enable();
    }

    function logCanvasSize() {
        for (const zoomDiv of zoomDivs) {
            if (zoomDiv) {
                zoomDiv.innerHTML = Math.floor(zoom * 100.0) + "%";
            }
        }
    }

    function scale() {
        disable();
        window.setTimeout(function () {
            openSheetMusicDisplay.Zoom = zoom;
            renderAndScrollBack();
            enable();
        }, 0);
    }

    function rerender() {
        disable();
        window.setTimeout(function () {
            if (openSheetMusicDisplay.IsReadyToRender()) {
                renderAndScrollBack();
            } else {
                console.log("[OSMD demo] Loses context!"); // TODO not sure that this message is reasonable, renders fine anyways. maybe vexflow context lost?
                selectSampleOnChange(); // reload sample e.g. after osmd.clear()
            }
            enable();
        }, 0);
    }

    function error(errString) {
        if (!errString) {
            error_tr.style.display = "none";
        } else {
            console.log("[OSMD demo] error: " + errString)
            err.textContent = errString;
            error_tr.style.display = "";
            canvas.width = canvas.height = 0;
            enable();
        }
    }

    // Enable/Disable Controls
    function disable() {
        document.body.style.opacity = 0.3;
        setDisabledForControls("disabled");
    }

    function enable() {
        document.body.style.opacity = 1;
        setDisabledForControls("");
        logCanvasSize();
    }

    function setDisabledForControls(disabledValue) {
        if (selectSample) {
            selectSample.disabled = disabledValue;
        }
        for (const zoomIn of zoomIns) {
            if (zoomIn) {
                zoomIn.disabled = disabledValue;
            }
        }
        for (const zoomOut of zoomOuts) {
            if (zoomOut) {
                zoomOut.disabled = disabledValue;
            }
        }
    }

    /**
     * Creates a Pdf of the currently rendered MusicXML
     * @param pdfName if no name is given, the composer and title of the piece will be used
     */
    async function createPdf(pdfName) {
        if (openSheetMusicDisplay.backendType !== BackendType.SVG) {
            console.log("[OSMD] createPdf(): Warning: createPDF is only supported for SVG background for now, not for Canvas." +
                " Please use osmd.setOptions({backendType: SVG}).");
            return;
        }

        if (pdfName === undefined) {
            pdfName = openSheetMusicDisplay.sheet.FullNameString + ".pdf";
        }

        const backends = openSheetMusicDisplay.drawer.Backends;
        let svgElement = backends[0].getSvgElement();

        let pageWidth = 210;
        let pageHeight = 297;
        const engravingRulesPageFormat = openSheetMusicDisplay.rules.PageFormat;
        if (engravingRulesPageFormat && !engravingRulesPageFormat.IsUndefined) {
            pageWidth = engravingRulesPageFormat.width;
            pageHeight = engravingRulesPageFormat.height;
        } else {
            pageHeight = pageWidth * svgElement.clientHeight / svgElement.clientWidth;
        }

        const orientation = pageHeight > pageWidth ? "p" : "l";
        // create a new jsPDF instance
        const pdf = new jsPDF.jsPDF({
            orientation: orientation,
            unit: "mm",
            format: [pageWidth, pageHeight]
        });
        //const scale = pageWidth / svgElement.clientWidth;
        for (let idx = 0, len = backends.length; idx < len; ++idx) {
            if (idx > 0) {
                pdf.addPage();
            }
            svgElement = backends[idx].getSvgElement();
            
            if (!pdf.svg && !svg2pdf) { // this line also serves to make the svg2pdf not unused, though it's still necessary
                // we need svg2pdf to have pdf.svg defined
                console.log("svg2pdf missing, necessary for jspdf.svg().");
                return;
            }
            await pdf.svg(svgElement, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            })
        }

        pdf.save(pdfName); // save/download the created pdf
        //pdf.output("pdfobjectnewwindow", {filename: "osmd_createPDF.pdf"}); // open PDF in new tab/window

        // note that using jspdf with svg2pdf creates unnecessary console warnings "AcroForm-Classes are not populated into global-namespace..."
        // this will hopefully be fixed with a new jspdf release, see https://github.com/yWorks/jsPDF/pull/32
    }

    // Register events: load, drag&drop
    window.addEventListener("load", function () {
        init();
    });
    window.addEventListener("dragenter", function (event) {
        event.preventDefault();
        disable();
    });
    window.addEventListener("dragover", function (event) {
        event.preventDefault();
    });
    window.addEventListener("dragleave", function (event) {
        enable();
    });

}());
