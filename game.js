// -------- Data --------
let verses = []; //every verse ends up here as {book, chapter, text}

const BOOKS = ["1 Nephi", "2 Nephi", "Jacob", "Enos", "Jarom", "Omni", "Words of Mormon", "Mosiah", "Alma", "Helaman", "3 Nephi", "4 Nephi", "Mormon", "Ether", "Moroni"];

// Turns "1 Nephi, 3" into {book: "1 Nephi", chapter: "3"}
// and "Enos" into {book: "Enos", chapter: ""} (all one-chapter books)

function splitReference(ref) {
    const parts = ref.split(",");
    const book = parts[0].trim();
    const chapter = parts.length > 1 ? parts[1].trim() : "";
    return { book, chapter };
}

async function loadVerses() {
    const response = await fetch("scriptures.csv"); // ask the server for the file
    const text = await response.text(); // read the file as plain text
    // header: false because the file has no header row.
    // Each row comes back as a list: "1 Nephi, 3", "And it came to pass..."]
    const result = Papa.parse(text, { header: false, skipEmptyLines: true });
    verses = result.data.map(row => {
        const { book, chapter } = splitReference(row[0]);
        return { book, chapter, text: row[1].trim() };
    });
    console.log("Loaded", verses.length, "verses", verses[0]);
    fillBookDropdown();
}

function fillBookDropdown() {
    const select = document.getElementById("book-select");
    for (const book of BOOKS) {
        const option = document.createElement("option");
        option.value = book;
        option.textContent = book;
        select.appendChild(option);
    }
}

loadVerses();

// --------- Game Settings ---------
const ROUNDS = 10;
// Fraction of words shown at each stage. Stage 0 = first guess, last stage = whole verse (final guess).
const REVEAL_STAGES = [0.15, 0.35, .55, 0.75, 1.0];
const POINTS = [100, 80, 60, 40, 20];

// --------- Game State ---------
let playerName = "";
let gameVerses = [];    // the 10 verses for this game
let round = 0;          // which verse we're on (0 to 9)
let stage = 0;          // how much is revealed (index into REVEAL_STAGES)
let score = 0;
let words = [];         // the current verse split into words
let revealOrder = [];   // the random order words get revealed in
