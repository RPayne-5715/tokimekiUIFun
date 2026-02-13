function parseTextingChain(json) {
  console.log("Parsing texting JSON", json); // Debug log for texting chain parsing
  const textingStack = [{ story: json.story || json, progress: [] }]; // Stack to manage texting contexts with progress tracking

  function processTextingEntry(autoTrigger = false) {
    if (textingStack.length === 0) {
      console.log("Texting Chain Ended: No more content to process.");
      endTextingChain();
      return;
    }

    const currentContext = textingStack[textingStack.length - 1];
    const { story, progress } = currentContext;

    // Find the next unprocessed entry
    const nextEntry = story.find((entry) => !progress.includes(entry));

    if (!nextEntry) {
      textingStack.pop(); // Exit the current texting context
      processTextingEntry(); // Continue with the previous context
      return;
    }

    progress.push(nextEntry); // Mark the entry as processed
    logDebug("Processing texting entry", nextEntry);

    const { character, dialogue, responses, branch, unlocks } = nextEntry;

    if (unlocks) {
      logDebug("Saving unlocks", unlocks);
      saveUnlocks(unlocks);
    }

    // Handle branch objects
    if (branch) {
      const { condition, story: branchStory } = branch;
      logDebug("Evaluating branch condition", condition);
      if (evaluateCondition(condition)) {
        logDebug("Branch condition met, processing branch story", branchStory);
        textingStack.push({ story: branchStory, progress: [] }); // Push the branch story onto the stack
        processTextingEntry();
      } else {
        logDebug("Branch condition not met, skipping branch.", condition);
        processTextingEntry(); // Continue with the current story
      }
      return; // Wait for user input
    }

    // Handle dialogue
    if (dialogue) {
      logDebug("Displaying dialogue", dialogue);

      displayDialogue(dialogue, character); // Pass character to displayDialogue

      if (autoTrigger) {
        // Automatically proceed for the first event
        setTimeout(() => processTextingEntry(), 100);
        return;
      }

      // Ensure we wait for user interaction before progressing
      const waitForClick = () => {
        document.removeEventListener("click", waitForClick);
        processTextingEntry();
      };

      document.addEventListener("click", waitForClick);
      return; // Wait for user input
    }

    // Handle responses
    if (responses) {
      logDebug("Displaying responses", responses);
      displayChoices(responses, processTextingEntry, { current: 0 });
      return; // Wait for user to select a response
    }

    // Automatically proceed for the first event if autoTrigger is true
    if (autoTrigger) {
      processTextingEntry();
      return;
    }

    // Wait for user interaction before progressing
    const waitForClick = () => {
      document.removeEventListener("click", waitForClick);
      processTextingEntry();
    };
    document.addEventListener("click", waitForClick);
  }

  processTextingEntry(true); // Trigger the first event automatically
}

function playTextingChain(jsonFilename) {
  if (!jsonFilename || typeof jsonFilename !== "string") {
    console.error("Invalid JSON filename provided to playTextingChain.");
    return;
  }

  fetch(`scripts/texting/${jsonFilename}`)
    .then((response) => response.json())
    .then((json) => {
      logDebug("Fetched texting JSON", json); // Debug log for fetched JSON
      parseMetadataAndConstants(json);
      parseTextingChain(json);
    })
    .catch((error) => logDebug("Error loading texting JSON", error));
}

function revealTextingContainer() {
  const textingContainer = document.getElementById("texting-container");
  if (textingContainer) {
    textingContainer.style.display = "block";
  } else {
    console.error("Texting container not found.");
  }
}

function displayDialogue(dialogue, character) {
  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("Message list container not found.");
    return;
  }

  const messageItem = document.createElement("div");
  messageItem.classList.add("message-item");
  messageItem.textContent = `${character ? character + ": " : ""}${dialogue}`;
  messageList.appendChild(messageItem);

  // Scroll to the bottom of the message list
  messageList.scrollTop = messageList.scrollHeight;
}

function displayChoices(options, processEntry, currentIndexRef) {
  const messageList = document.getElementById("message-list");
  if (!messageList) {
    console.error("Message list container not found.");
    return;
  }

  // Create a container for the choices
  const choiceMessage = document.createElement("div");
  choiceMessage.classList.add("message-item", "user-message"); // Style as a user message

  const choiceList = document.createElement("div");
  choiceList.classList.add("choice-list"); // Add a class for styling the choice list

  options.forEach((option) => {
    const choiceButton = document.createElement("button");
    choiceButton.textContent = option.text;
    choiceButton.classList.add("choice-button");

    choiceButton.addEventListener("click", () => {
      // Replace the choices with the selected option's text
      choiceMessage.innerHTML = `<div class='selected-choice'>${option.text}</div>`;

      if (option.effects) {
        applyEffects(option.effects);
      }
      if (option.toast) {
        showToast(option.toast, option.effects);
      }

      // Add a timeout before re-enabling click listeners
      setTimeout(() => {
        processEntry();
      }, 100);
    });

    choiceList.appendChild(choiceButton);
  });

  choiceMessage.appendChild(choiceList);
  messageList.appendChild(choiceMessage);

  // Scroll to the bottom of the message list
  messageList.scrollTop = messageList.scrollHeight;
}

function endTextingChain() {
  console.log("Texting chain has ended.");
  const textingContainer = document.getElementById("texting-container");
  if (textingContainer) {
    textingContainer.style.display = "none";
  }
}
