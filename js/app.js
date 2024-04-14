// Define variables for game state
let texts = [];
let currentTextIndex = 0;
let currentText = {};
let userInput = '';
let gameRunning = false;
let startTime, endTime;
let currentLanguage = 'Swedish'; // Default language
let markerIndex = 0;
let textToSpeedWrite;
let wordsTyped = 0;
let errors = 0;
let ignoreCase = false; // New variable for case sensitivity
let errorSound = new Audio("audio/wrong-char.mp3");
const imagePaths = {
    start: 'img/play.png',
    stop: 'img/stop.png',
};
// Load texts from XML or hardcoded data
function loadTextsFromXML() {
    fetch('data/texts.xml')
        .then(response => response.text())
        .then(xmlString => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const textsNodeList = xmlDoc.querySelectorAll('selectText');
            const loadedTexts = []; // Initialize an array to store loaded texts

            textsNodeList.forEach(textNode => {
                const author = textNode.querySelector('author').textContent;
                const title = textNode.querySelector('title').textContent;
                const language = textNode.querySelector('language').textContent;
                const content = textNode.querySelector('text').textContent;

                // Push the loaded text into the loadedTexts array
                loadedTexts.push({
                    author: author,
                    title: {
                        Swedish: title, // Assuming title is the same in both languages
                        English: title
                    },
                    language: language,
                    content: {
                        Swedish: content,
                        English: content
                    }
                });
            });

            // Update the global texts array with the loaded texts
            texts = loadedTexts;

            // Call functions to update UI with loaded texts
            if (texts.length > 0) {
                selectText(0);
                updateTextDetails();
                updateTextSelector();
                updateStartStopButton();
                updateBackgroundImage();
            } else {
                // Update the UI to indicate no texts available
                const h1Title = document.getElementById('h1title');
                const h2Author = document.getElementById('h2author');
                h1Title.textContent = 'No Texts Available';
                h2Author.textContent = '';
                document.getElementById('textToSpeedWrite').textContent = '';
                document.getElementById('wordCount').textContent = '';
                document.getElementById('charCount').textContent = '';
                document.getElementById('startstopbutton').disabled = true; // Disable start/stop button
                document.getElementById('textSelector').disabled = true; // Disable text selector
            }
        })
        .catch(error => console.error('Error loading texts from XML:', error));
}


// Initialize the game
function initGame() {
    loadTextsFromXML();
    // Check if texts are available
    if (texts.length > 0) {
        selectText(0); // Make sure to call selectText to update currentText and currentTextIndex
        updateTextDetails();
        updateStartStopButton();
        updateBackgroundImage();
    }

    updateStartStopButton();
    updateBackgroundImage(); // Set initial background image for start and stop buttons
}

// The text selector dropdown
function updateTextSelector() {
    const textSelector = document.getElementById('textSelector');
    const selectedTextLanguage = texts[currentTextIndex].language;

    // Update language radio buttons based on the selected text language
    const swedishRadio = document.getElementById('swedishRadio');
    const englishRadio = document.getElementById('englishRadio');
    if (selectedTextLanguage === 'swedish') {
        swedishRadio.checked = true;
    } else if (selectedTextLanguage === 'english') {
        englishRadio.checked = true;
    }

    textSelector.innerHTML = '';

    texts.forEach((text, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = text.title[currentLanguage];
        textSelector.add(option);
    });
}

// Select a text based on the user's choice
function selectText(index) {
    currentTextIndex = index;
    currentText = texts[index];

    // Check if currentText is defined before updating details
    if (currentText) {
        updateTextDetails();
        updateTextSelector(); // Call updateTextSelector here
    }
}
// Update the text details area
function updateTextDetails() {
    const h1Title = document.getElementById('h1title');
    const h2Author = document.getElementById('h2author');
    const textToSpeedWrite = document.getElementById('textToSpeedWrite');
    const wordCountDisplay = document.getElementById('wordCount');
    const charCountDisplay = document.getElementById('charCount');

    // Calculate words and characters from the selected text
    const words = getWordCount(currentText.content[currentLanguage]);
    const characters = currentText.content[currentLanguage].length;

    h1Title.textContent = currentText.title[currentLanguage]; // Author name and words and chars number  
    h2Author.innerHTML = `${currentText.author} <span class="count-details">(${words} words, ${characters} chars)</span>`;

    // Create spans for each character and append to the text content
    for (let i = 0; i < characters; i++) {
        const charSpan = document.createElement('span');
        charSpan.textContent = currentText.content[currentLanguage][i];
        charSpan.id = `char${i}`;
        textToSpeedWrite.appendChild(charSpan);
    }

    userInput = '';
    updateTextContentHighlight();
}
// Function to calculate word count
function getWordCount(text) {
    // Using a simple regex to count words
    const words = text.match(/\S+/g) || [];
    return words.length;
}
// Update the text content with highlighting
function updateTextContentHighlight() {
    const textToSpeedWrite = document.getElementById('textToSpeedWrite');
    const textContent = currentText.content[currentLanguage];

    let html = '';

    for (let i = 0; i < textContent.length; i++) {
        let charClass = '';

        // Check if the character is correctly entered
        if (i < userInput.length) {
            charClass = userInput[i] === textContent[i] ? 'correct-char' : 'incorrect-char';
        }

        // Highlight the current character
        if (i === markerIndex) {
            charClass += ' current-char';
        }

        html += `<span class="${charClass}">${textContent[i]}</span>`;
    }

    textToSpeedWrite.innerHTML = html;
}

// Modify the input event listener to update the marker position
document.getElementById('writingbox').addEventListener('input', function (event) {
    userInput = ignoreCase ? event.target.value.toLowerCase() : event.target.value;
    updateTextContentHighlight();

    // Update marker position based on user input length
    markerIndex = userInput.length;

    // Play error sound for incorrect entries
    playErrorSound();
});

// Start or stop the game
function toggleGame() {
    if (gameRunning) {
        stopGame();
    } else {
        startGame();
    }
}

// Start the game
function startGame() {
    gameRunning = true;

    // Reset markerIndex to the beginning
    markerIndex = 0;

    // Clear previous user input and update highlighting
    userInput = '';
    document.getElementById('writingbox').value = ''; // Clear the input field
    updateTextContentHighlight();

    // Reset statistics
    const grossWpm = document.getElementById('grosswpm');
    const accuracy = document.getElementById('accuracy');
    const netWpm = document.getElementById('netwpm');
    const errorsDisplay = document.getElementById('errors');

    grossWpm.textContent = '0.00';
    accuracy.textContent = '0.00';
    netWpm.textContent = '0.00';
    errorsDisplay.textContent = '0';

    // Reset the start/stop button text
    updateStartStopButton();
    // Update background image
    updateBackgroundImage();
    // Record the start time
    startTime = new Date().getTime();
}

// Stop the game and calculate statistics
function stopGame() {
    gameRunning = false;
    endTime = new Date().getTime();

    const elapsedMinutes = (endTime - startTime) / (1000 * 60);
    const typedEntries = userInput.split(' ').filter(Boolean).length;
    const errors = calculateErrors();

    var grossWPM = (typedEntries / 5) / elapsedMinutes;
    var netWPM = grossWPM - (errors / elapsedMinutes);
    if (netWPM < 0) {
        netWPM = 0;
    }
    updateStatistics(grossWPM, netWPM, errors);

    updateStartStopButton();
    // Update background image
    updateBackgroundImage();

    // Clear the input field
    document.getElementById('writingbox').value = '';
}


function updateBackgroundImage() {
    const startStopBtn = document.getElementById('startstopbutton');
    const backgroundImage = gameRunning ? imagePaths.stop : imagePaths.start;
    startStopBtn.style.backgroundImage = `url(${backgroundImage})`;
}

// function to calculate errors and play error sound
function calculateErrors() {
    // Check if currentText is defined and has content
    if (currentText && currentText.content && typeof currentText.content === 'object') {
        // Get the content for the current language
        const currentLanguageContent = currentText.content[currentLanguage];

        if (typeof currentLanguageContent === 'string') {
            const expectedChars = currentLanguageContent.split('');
            const userChars = userInput.split('');

            let errorCount = 0;

            for (let i = 0; i < expectedChars.length; i++) {
                const expectedChar = expectedChars[i];
                const userChar = userChars[i];

                // Check for case-insensitive equality
                const isMatch = ignoreCase
                    ? userChar !== undefined && userChar.toLowerCase() === expectedChar.toLowerCase()
                    : userChar === expectedChar;

                if (!isMatch) {
                    errorCount++;
                }
            }

            return errorCount;
        } else {
            console.error('Cannot calculate errors: Content is not a string.', currentText);
        }
    } else {
        console.error('Cannot calculate errors: currentText is', currentText);
    }

    return 0; // Return a default value if there's an issue
}

// Modified function to play error sound
function playErrorSound() {
    const expectedChar = currentText.content[currentLanguage][markerIndex];
    const userChar = userInput[markerIndex];

    if (userChar !== undefined && expectedChar !== undefined) {
        const isMatch = ignoreCase
            ? userChar.toLowerCase() === expectedChar.toLowerCase()
            : userChar === expectedChar;

        if (!isMatch) {
            // Create a new instance of the Audio element
            const errorSoundInstance = errorSound.cloneNode();

            // Reset the playback position before playing the sound
            errorSoundInstance.currentTime = 0;

            // Play the error sound
            errorSoundInstance.play();
        }
    }
}

// Update the game statistics area
function updateStatistics(grossWPM, netWPM, errors) {
    const grossWpm = document.getElementById('grosswpm');
    const accuracy = document.getElementById('accuracy');
    const netWpm = document.getElementById('netwpm');
    const errorsDisplay = document.getElementById('errors');

    grossWpm.textContent = grossWPM.toFixed(2);
    accuracy.textContent = ((1 - errors / userInput.length) * 100).toFixed(2);
    netWpm.textContent = netWPM.toFixed(2);
    errorsDisplay.textContent = errors;
}

// Update the start/stop button based on the game state
function updateStartStopButton() {
    const startStopBtn = document.getElementById('startstopbutton');
    startStopBtn.textContent = gameRunning ? '' : '';
}

// Event listener for user input
document.getElementById('writingbox').addEventListener('input', function (event) {
    userInput = event.target.value;
    updateTextContentHighlight();
});

// Event listener for text selector changes
document.getElementById('textSelector').addEventListener('change', function (event) {
    selectText(event.target.value);
    updateTextDetails();
});

// Event listener for start/stop button clicks
document.getElementById('startstopbutton').addEventListener('click', toggleGame);

// Event listener for language radio buttons
const languageRadios = document.getElementsByName('language');
languageRadios.forEach(radio => {
    radio.addEventListener('change', function (event) {
        switchLanguage(event.target.value);
    });
});

// Function to switch between English and Swedish
function switchLanguage(language) {
    currentLanguage = language;
    updateTextDetails();
}
// Event listener for ignore case checkbox
document.getElementById('ignorecase').addEventListener('change', function (event) {
    ignoreCase = event.target.checked;
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function () {
    initGame();
});