import { saveScore, getTopScores } from "./firebase.js";

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
    try {
        const response = await fetch("scriptures.csv"); // ask the server for the file
        if (!response.ok) throw new Error(`Could not load scriptures.csv (${response.status})`);
        const text = await response.text(); // read the file as plain text
        // header: false because the file has no header row.
        // Each row comes back as a list: ["1 Nephi, 3", "And it came to pass..."]
        const result = Papa.parse(text, { header: false, skipEmptyLines: true });
        verses = result.data.map(row => {
            const { book, chapter } = splitReference(row[0]);
            return { book, chapter, text: row[1].trim() };
        });
        console.log("Loaded", verses.length, "verses", verses[0]);
        fillBookDropdown();
    } catch (err) {
        console.error(err);
        alert("Sorry, the verses couldn't be loaded. Please check your connection and refresh the page.");
    }
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
const REVEAL_STAGES = [0.15, 0.35, 0.55, 0.75, 1.0];
const POINTS = [100, 80, 60, 40, 20];
const BOOK_BONUS = [30, 25, 20, 15, 10];   // correct book but chapter never correct
const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

// Shown when you get the whole answer right, by which guess it was.
const CORRECT_MESSAGES = [
    "You saucy monkey, you got it!",
    "Bravo! A triumph for the ages!",
    "Rejoice! The struggle bears fruit!",
    "Forsooth! Thou hast wrestled the answer from the fog!",
    "Huzzah! 'Twas a near thing, but thou hast prevailed, good scholar!",
];

// Shown after a wrong guess (there are four, since the fifth guess is the last).
const WRONG_MESSAGES = [
    "Not quite I'm afraid... try again with more of the words visible.",
    "Nope, not that one! Here are a few more words to help.",
    "Still not it... keep going, the verse is getting clearer.",
    "Zoinks! That's the wrooooong answer! One last try with the whole verse visible!",
];

// Opening phrase for the book-only bonus message, by which guess got the book.
const BONUS_OPENERS = [
    "Fear not!",
    "Hark, brave scholar! All is not lost!",
    "Don't fret!",
    "By my troth, a pittance of honor!",
    "Zounds! A morsel of glory!"
];

function bonusMessage(i) {
    return `${BONUS_OPENERS[i]} You get ${BOOK_BONUS[i]} bonus points for entering the correct book on your ${ORDINALS[i]} guess!`;
}


// --------- Game State ---------
let playerName = "";
let gameVerses = [];    // the 10 verses for this game
let round = 0;          // which verse we're on (0 to 9)
let stage = 0;          // how much is revealed (index into REVEAL_STAGES)
let score = 0;
let words = [];         // the current verse split into words
let revealOrder = [];   // the random order words get revealed in
let bookStage = -1;     // first guess that got the book right (-1 = none yet)
let guessedThisVerse = [];   // guesses already made on this verse: {key, label}

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
    for (const s of ["start-screen", "game-screen", "end-screen", "scoreboard-screen"]) {
        document.getElementById(s).hidden = (s !== id);
    }
}


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
// Briefly highlights an element so players can see that it just changed.
function flash(el) {
    el.classList.remove("flash");
    void el.offsetWidth;   // restart the animation
    el.classList.add("flash");
}

// Shows a message under the buttons. warning = true styles it as a caution.
function showFeedback(text, warning = false) {
    const el = document.getElementById("feedback");
    el.textContent = text;
    el.classList.toggle("warning", warning);
    if (text) flash(el);
}

// Lists the guesses already made on this verse, so players don't repeat themselves.
function renderGuessedList() {
    const list = document.getElementById("guessed-items");
    list.innerHTML = "";
    for (const guess of guessedThisVerse) {
        const li = document.createElement("li");
        li.textContent = guess.label;
        list.appendChild(li);
    }
    document.getElementById("guessed-box").hidden = (guessedThisVerse.length === 0);
}

// Shows "Guess 2 of 5" and a row of dots: filled for guesses already used.
function renderGuessCounter() {
    const total = REVEAL_STAGES.length;
    const dots = Array.from({ length: total }, (_, i) => (i < stage ? "●" : "○")).join(" ");
    const label = (stage === total - 1) ? "Final guess!" : `Guess ${stage + 1} of ${total}`;
    const el = document.getElementById("guess-counter");
    el.textContent = `${label} · ${dots}`;
    flash(el);
}

// Draws the verse with only some words visible. Words revealed by the latest guess are highlighted.
function renderVerse() {
    const shownNow = new Set(revealOrder.slice(0, Math.ceil(words.length * REVEAL_STAGES[stage])));
    const shownBefore = stage > 0
        ? new Set(revealOrder.slice(0, Math.ceil(words.length * REVEAL_STAGES[stage - 1])))
        : new Set();
    const verseEl = document.getElementById("verse");
    verseEl.innerHTML = "";
    words.forEach((w, i) => {
        const span = document.createElement("span");
        span.textContent = shownNow.has(i) ? w : maskWord(w);
        if (shownNow.has(i) && !shownBefore.has(i) && stage > 0) span.className = "new-word";
        verseEl.appendChild(span);
        verseEl.appendChild(document.createTextNode(" "));
    });
    renderGuessCounter();
    document.getElementById("round-info").textContent =
        `Verse ${round + 1} of ${ROUNDS} · worth ${POINTS[stage]} points`;
    document.getElementById("score").textContent = `Score: ${score}`;
}

// On phones the verse can sit above the keyboard; make sure it is on screen after each guess.
function keepVerseInView() {
    document.getElementById("verse").scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    bookStage = -1;
    guessedThisVerse = [];
    renderGuessedList();
    showFeedback("");
    document.getElementById("chapter-input").value = "";
    document.getElementById("guess-btn").disabled = false;
    // Only auto-focus on computers; on phones it would pop up the keyboard every verse.
    if (!window.matchMedia("(pointer: coarse)").matches) {
        document.getElementById("chapter-input").focus();
    }
    renderVerse();
}

function handleGuess() {
    const verse = gameVerses[round];
    const book = document.getElementById("book-select").value;
    const chapterText = document.getElementById("chapter-input").value.trim();

    // A blank chapter is the right answer for one-chapter books.
    const chapterGuess = chapterText === "" ? "" : String(Number(chapterText));
    const bookRight = (book === verse.book);
    const guessLabel = chapterGuess === "" ? book : `${book} ${chapterGuess}`;

    // Don't count (or charge a guess for) an answer that was already tried on this verse.
    const guessKey = `${book}|${chapterGuess}`;
    if (guessedThisVerse.some(g => g.key === guessKey)) {
        showFeedback(`Hold on! You already guessed ${guessLabel} on this verse, so that guess wasn't counted. Try something different.`, true);
        return;
    }
    guessedThisVerse.push({ key: guessKey, label: guessLabel });
    renderGuessedList();
    const correct = bookRight && (chapterGuess === verse.chapter);

    // Remember the first guess that got the book right (for bonus points).
    if (bookRight && bookStage === -1) bookStage = stage;

    if (correct) {
        score += POINTS[stage];
        finishVerse(`${CORRECT_MESSAGES[stage]} You get ${POINTS[stage]} points! It's ${referenceText(verse)}.`);
    } else if (stage < REVEAL_STAGES.length - 1) {
        const reply = bookRight
            ? "Eureka! You got the book right, but the chapter is not exactly right. Keep trying!"
            : WRONG_MESSAGES[stage];
        // Echo the guess so players can see it registered, then move to the next stage.
        showFeedback(`Guess ${stage + 1} was ${guessLabel}. ${reply}`);
        stage++;
        renderVerse();
        keepVerseInView();
    } else {
        let message = `Womp womp womp :( That is incorrect. The correct answer was ${referenceText(verse)}. Better luck on the next question!`;
        if (bookStage !== -1) {
            score += BOOK_BONUS[bookStage];
            message += " " + bonusMessage(bookStage);
        }
        finishVerse(message);
    }
}

// Shows the full verse and the answer, then waits for the player to click Next.
function finishVerse(message) {
    const verse = gameVerses[round];
    document.getElementById("verse").textContent = verse.text;
    showFeedback(message);
    document.getElementById("score").textContent = `Score: ${score}`;
    document.getElementById("guess-btn").disabled = true;
    keepVerseInView();

    const nextBtn = document.getElementById("next-btn");
    nextBtn.textContent = (round === ROUNDS - 1) ? "See results" : "Next";
    nextBtn.hidden = false;
}

// entries looks like [{name: "Carson", score: 640}, {name: "Sam", score: 520}]
// For each entry, add an <li> to #scoreboard that reads "Carson: 640".
function renderScoreboard(entries, boardId = "scoreboard") {
    const board = document.getElementById(boardId);
    board.innerHTML = "";   // clear the old list first
    for (const entry of entries) {
        const li = document.createElement("li");
        li.textContent = `${entry.name}: ${entry.score}`;
        board.appendChild(li);
    }
}

//Temporary version until the scoreboard is added.
// Opens the scoreboard on its own, without playing a game.
async function showScoreboard() {
    showScreen("scoreboard-screen");
    const board = document.getElementById("scoreboard-view");
    board.innerHTML = "<li>Loading scoreboard...</li>";
    try {
        const top = await getTopScores(10);
        if (top.length === 0) {
            board.innerHTML = "<li>No scores yet. Be the first to play!</li>";
        } else {
            renderScoreboard(top, "scoreboard-view");
        }
    } catch (err) {
        console.error(err);
        board.innerHTML = "<li>Couldn't reach the scoreboard. Check your connection and try again.</li>";
    }
}

async function endGame() {
    showScreen("end-screen");
    document.getElementById("final-score").textContent = score;
    const board = document.getElementById("scoreboard");
    board.innerHTML = "<li>Loading scoreboard...</li>";
    try {
        await saveScore(playerName, score);
        const top = await getTopScores(10);
        renderScoreboard(top);
    } catch (err) {
        console.error(err);
        board.innerHTML = "<li>Couldn't reach the scoreboard. Check the Console.</li>";
    }
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

document.getElementById("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") startGame();
});

document.getElementById("view-scoreboard-btn").addEventListener("click", showScoreboard);
document.getElementById("back-btn").addEventListener("click", () => showScreen("start-screen"));

loadVerses();