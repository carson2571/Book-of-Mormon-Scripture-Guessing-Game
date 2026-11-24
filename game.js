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

// --------- Helpers ---------
// Returns a shuffled copy of a list.
function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Shows one screen and hides the other two.
function showScreen(id) {
    for (const s of ["start-screen", "game-screen", "end-screen"]) {
        document.getElementById(s).hidden = (s !== id);
    }
}

// EXERCISE 1
// Turn every letter in a word into "*", but keep punctuation.
// maskWord("Nephi,") should return "*****,"
// maskWord("Lord's") should return "****'*"
function maskWord(word) {
    let result = "";
    for (const ch of word) {
        if (/[a-zA-Z]/.test(ch)) {
            result += "*";
        } else {
            result += ch;
        }
    }

    return result;
}

// "1 Nephi 3", or just "Enos" for one-chapter books.
function referenceText(verse) {
    return verse.chapter ? `${verse.book} ${verse.chapter}` : verse.book;
}

// Draws the verse with only some words visible.
function renderVerse() {
    const shownCount = Math.ceil(words.length * REVEAL_STAGES[stage]);
    const shown = new Set(revealOrder.slice(0, shownCount));
    const display = words.map((w, i) => shown.has(i) ? w : maskWord(w));
    document.getElementById("verse").textContent = display.join(" ");
    document.getElementById("round-info").textContent = `Verse ${round + 1} of ${ROUNDS} . worth ${POINTS[stage]} points`;
    document.getElementById("score").textContent = `Score: ${score}`;
}

function startGame() {
    playerName = document.getElementById("name-input").value.trim();
    if (playerName === "") { alert("Please enter your name."); return; }
    if (verses.length === 0) { alert("Verses are still loading. Try again in a second."); return; }
    gameVerses = shuffle(verses).slice(0, ROUNDS);
    round = 0;
    score = 0;
    showScreen("game-screen");
    startRound();
}

function startRound() {
    const verse = gameVerses[round];
    words = verse.text.split(" ");
    revealOrder = shuffle(words.map((_, i) => i));
    stage = 0;
    document.getElementById("feedback").textContent = "";
    document.getElementById("chapter-input").value = "";
    document.getElementById("guess-btn").disabled = false;
    document.getElementById("chapter-input").focus();
    renderVerse();
}

function handleGuess() {
    const verse = gameVerses[round];
    const book = document.getElementById("book-select").value;
    const chapterText = document.getElementById("chapter-input").value.trim();
    const feedback = document.getElementById("feedback");

    // A blank chapter is the right answer for one-chapter books.
    const chapterGuess = chapterText === "" ? "" : String(Number(chapterText));
    const correct = (book === verse.book) && (chapterGuess === verse.chapter);

    if (correct) {
        score += POINTS[stage];
        finishVerse(`Correct! +${POINTS[stage]} points. It's ${referenceText(verse)}.`);
    } else if (stage < REVEAL_STAGES.length - 1) {
        stage++;
        feedback.textContent = (book === verse.book) ? "Right book, wrong chapter. More words revealed." : "Not quite. More words revealed.";
        renderVerse();
    } else {
        finishVerse(`Out of guesses. It was ${referenceText(verse)}.`);
    }
}

// Shows the full verse and the answer, then waits for the player to click Next.
function finishVerse(message) {
    const verse = gameVerses[round];
    document.getElementById("verse").textContent = verse.text;
    document.getElementById("feedback").textContent = message;
    document.getElementById("score").textContent = `Score: ${score}`;
    document.getElementById("guess-btn").disabled = true;

    const nextBtn = document.getElementById("next-btn");
    nextBtn.textContent = (round === ROUNDS - 1) ? "See results" : "Next";
    nextBtn.hidden = false;
}

//Temporary version until the scoreboard is added.
function endGame() {
    showScreen("end-screen");
    document.getElementById("final-score").textContent = score;
}

function handleNext() {
    document.getElementById("next-btn").hidden = true;
    round++;
    if (round < ROUNDS) startRound();
    else endGame();
}

// -------- Wire up the buttons --------
document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("guess-btn").addEventListener("click", handleGuess);
document.getElementById("again-btn").addEventListener("click", () => showScreen("start-screen"));
document.getElementById("next-btn").addEventListener("click", handleNext);
document.getElementById("chapter-input").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const nextBtn = document.getElementById("next-btn");
    if (!nextBtn.hidden) handleNext();  // verse is finished, so Enter means next
    else handleGuess();                 // still guessing, so Enter means Guess
});

loadVerses();