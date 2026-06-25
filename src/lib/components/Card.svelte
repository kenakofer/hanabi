<!-- /lib/components/Card.svelte -->

<script lang="ts">
  import { gameConfigStore } from "../stores/gameConfigStore";
  import { getSuits, SuitEnum, suitProperties } from "../models/variantEnums";
  import { getNumbers, NumberEnum } from "../models/numberEnums";
  import { activeMenuCard } from "../stores/menuStore";
  import { cardsSelectedStore } from "../stores/cardsSelectedStore";
  import { onMount, onDestroy } from "svelte";
  import { contextOnCardsStore } from "../stores/contextOnCardsStore";
  import { informationOnCardsStore } from "../stores/informationOnCardsStore";
  import { actionStore } from "../stores/actionStore";
  import gameOrReviewStore from "../stores/gameOrReviewStore";
  import type { ManualEliminate } from "../models/gameActions";


  import Number from "./Number.svelte";
  import Colour from "./Colour.svelte";

  export let id: number;
  export let numberInformation: NumberEnum;
  export let knownNumberInformation: NumberEnum;
  export let crossedNumberInformation: NumberEnum = 0 as NumberEnum;
  export let colourInformation: SuitEnum;
  export let knownColourInformation: SuitEnum;
  export let crossedColourInformation: SuitEnum = 0 as SuitEnum;
  export let note: string;
  export let selected: boolean = false;
  export let isHinted: boolean;
  export let isFinessed: boolean;
  export let isChopMoved: boolean;
  export let isCritical: boolean;
  export let onSelect: (id: number) => void;

  $: localMode = $activeMenuCard === id ? "menu" : "card";
  $: isMenuActive = $activeMenuCard !== null;
  $: numberOfCards = $gameConfigStore.numberOfCards;
  // Selected is shown via a white glow (see CSS); the border conveys
  // critical / hinted / finessed / chop-moved / default.
  $: borderColour = isCritical
    ? "var(--border-critical)"
    : isHinted
      ? "var(--border-hinted)"
      : isFinessed
        ? "var(--border-finessed)"
        : isChopMoved
          ? "var(--border-chopmoved)"
          : "var(--border-default)";

  let knownColour: string | null = null;
  $: {
    if (isSingleFlag(colourInformation)) {
      knownColour = getColourCodeFromSuit(colourInformation);
    } else {
      knownColour = null;
    }
  }

  interface NumberIconStyles {
    backgroundColour: string;
    strokeColour: string;
  }

  let numberIconStyles: NumberIconStyles = {
    backgroundColour: "white",
    strokeColour: "black",
  };

  $: {
    switch (knownColour) {
      case "red":
        numberIconStyles.strokeColour = "white";
        numberIconStyles.backgroundColour = "red";
        break;
      case "blue":
        numberIconStyles.strokeColour = "white";
        numberIconStyles.backgroundColour = "mediumblue";
        break;
      case "green":
        numberIconStyles.strokeColour = "white";
        numberIconStyles.backgroundColour = "green";
        break;
      case "teal":
        numberIconStyles.strokeColour = "white";
        numberIconStyles.backgroundColour = "teal";
        break;
      case "black":
        numberIconStyles.strokeColour = "white";
        numberIconStyles.backgroundColour = "white";
        break;
      case "rainbow":
        numberIconStyles.strokeColour = "black";
        numberIconStyles.backgroundColour = "white";
        break;
      case "yellow":
        numberIconStyles.strokeColour = "black";
        numberIconStyles.backgroundColour = "yellow";
        break;
      case "white":
        numberIconStyles.strokeColour = "black";
        numberIconStyles.backgroundColour = "white";
        break;
      default:
        numberIconStyles.backgroundColour = "lightgrey";
        numberIconStyles.strokeColour = "white";
    }
  }

  // Toggle mode function
  function toggleMode() {
    if (localMode === "card" && !isMenuActive) {
      activeMenuCard.set(id);
      cardsSelectedStore.set(new Set<number>());
    } else if (localMode === "menu") {
      const noteField = (
        document.getElementById("noteField") as HTMLInputElement
      ).value as string;
      if (noteField != contextOnCardsStore.get(id).note) {
        const oldContext = contextOnCardsStore.get(id);
        contextOnCardsStore.set(id, { ...oldContext, note: noteField });
      }
      activeMenuCard.set(null);
    }
    cardsSelectedStore.set(new Set<number>());
  }

  function closeMenu() {
    const noteField = (document.getElementById("noteField") as HTMLInputElement)
      .value as string;
    if ($activeMenuCard) {
      const oldContext = contextOnCardsStore.get($activeMenuCard);
      contextOnCardsStore.set($activeMenuCard, { ...oldContext, note: noteField });
      activeMenuCard.set(null);
    }
    cardsSelectedStore.set(new Set<number>());
  }

  function getColourCodeFromSuit(suit: SuitEnum): string {
    return suitProperties[suit].string.toLowerCase();
  }

  function isSingleFlag(bitflag: SuitEnum | NumberEnum): boolean {
    return (bitflag & (bitflag - 1)) == 0;
  }

  // Toggle a black X over a single possibility on this card. Records a
  // ManualEliminate action so it can be undone like a hint. Only allowed during
  // live play (not while reviewing). This does not remove the possibility —
  // clues still do that via colourInformation/numberInformation.
  function eliminateColour(suit: SuitEnum): void {
    if (!$gameOrReviewStore) return; // disabled in review mode
    const info = informationOnCardsStore.get(id);
    const previous = info.crossedColourInformation;
    const next = (previous ^ suit) as SuitEnum; // toggle the X
    informationOnCardsStore.set(id, { ...info, crossedColourInformation: next });
    const action: ManualEliminate = {
      actionType: "ManualEliminate",
      id,
      trait: "colour",
      hintString: suitProperties[suit].string,
      previousInformation: previous,
      newInformation: next,
    };
    actionStore.push(action);
  }

  function eliminateNumber(num: NumberEnum): void {
    if (!$gameOrReviewStore) return; // disabled in review mode
    const info = informationOnCardsStore.get(id);
    const previous = info.crossedNumberInformation;
    const next = (previous ^ num) as NumberEnum; // toggle the X
    informationOnCardsStore.set(id, { ...info, crossedNumberInformation: next });
    const action: ManualEliminate = {
      actionType: "ManualEliminate",
      id,
      trait: "number",
      hintString: String(Math.log2(num) + 1),
      previousInformation: previous,
      newInformation: next,
    };
    actionStore.push(action);
  }

  // Tapping a trait icon toggles a black X over it (negative info the player
  // inferred). When only one possibility remains (or we're in review), the tap
  // falls through to toggling the card's selected state, like tapping the card
  // itself.
  function handleNumberTap(num: NumberEnum): void {
    if (!$gameOrReviewStore || isSingleFlag(numberInformation)) {
      if ($activeMenuCard === null) onSelect(id);
      return;
    }
    eliminateNumber(num);
  }

  function handleColourTap(suit: SuitEnum): void {
    if (!$gameOrReviewStore || isSingleFlag(colourInformation)) {
      if ($activeMenuCard === null) onSelect(id);
      return;
    }
    eliminateColour(suit);
  }

  function toggleCritical(): void {
    const oldContext = contextOnCardsStore.get(id);
    contextOnCardsStore.set(id, { ...oldContext, isCritical: !isCritical });
  }

  function toggleChopMoved(): any {
    const oldContext = contextOnCardsStore.get(id);
    contextOnCardsStore.set(id, { ...oldContext, isChopMoved: !isChopMoved });
  }

  function toggleFinessed(): any {
    const oldContext = contextOnCardsStore.get(id);
    contextOnCardsStore.set(id, { ...oldContext, isFinessed: !isFinessed });
  }

  let timeoutId: ReturnType<typeof setTimeout>;

  function handleInteractionStart(event: MouseEvent | TouchEvent): void {
    const targetElement = event.target as HTMLElement;
    // Check if the event was initiated from the card or its children
    if (targetElement.closest(".menu")) {
      return;
    }
    if (targetElement.closest(".card")) {
      event.preventDefault(); // Prevent default only if it's within the card
      timeoutId = setTimeout(() => {
        // Long press logic only triggers if the initial target was the card itself
        if (targetElement.closest(".card")) {
          toggleMode();
        }
      }, 500); // Long press delay
    }
  }

  function handleInteractionEnd(event: MouseEvent | TouchEvent): void {
    clearTimeout(timeoutId);
    const targetElement = event.target as HTMLElement;
    // Handle tap or click on the card, ignoring menu button clicks
    if (
      targetElement.closest(".card") &&
      !targetElement.closest(".menu-button") &&
      $activeMenuCard === null
    ) {
      onSelect(id); // Selection logic if not a menu button
    } else if (
      targetElement.closest(".card") &&
      !targetElement.closest(".menu-button") &&
      $activeMenuCard !== id
    ) {
      closeMenu();
    }
  }

  function handleRightClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest(".card")) {
      event.preventDefault();
      toggleMode();
    }
  }

  // Function to handle global clicks for closing the menu
  function handleClickOutside(event: MouseEvent | TouchEvent): void {
    if (!$activeMenuCard) return; // Exit if no menu is active
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest(".card")) {
      closeMenu(); // Close the menu if clicked outside any card
    }
  }

  onMount(() => {
    document.body.addEventListener("click", handleClickOutside, true);
  });

  onDestroy(() => {
    document.body.removeEventListener("click", handleClickOutside, true);
  });
</script>

<div
  class="card no-{numberOfCards} {knownColour != null
    ? knownColour
    : ''} {selected ? 'selected' : ''}"
  tabindex="0"
  role="button"
  on:contextmenu|preventDefault={handleRightClick}
  on:mousedown={handleInteractionStart}
  on:mouseup={handleInteractionEnd}
  on:touchstart={handleInteractionStart}
  on:touchend={handleInteractionEnd}
  on:touchcancel={handleInteractionEnd}
  style="border-color: {borderColour};"
>
  {#if $activeMenuCard !== id}
    <p class="card-id">{note !== "" ? note : "Card " + (id + 1)}</p>
    <div class="number-icons">
      {#each getNumbers(numberInformation) as numberEnum}
        <button
          type="button"
          class="trait-icon"
          class:crossed={crossedNumberInformation & numberEnum}
          title="Cross off {Math.log2(numberEnum) + 1}"
          on:click|stopPropagation={() => handleNumberTap(numberEnum)}
          on:mousedown|stopPropagation
          on:mouseup|stopPropagation
          on:touchstart|stopPropagation
          on:touchend|stopPropagation
          on:contextmenu|preventDefault|stopPropagation
        >
          <Number
            backgroundColour={numberIconStyles.backgroundColour}
            strokeColour={knownNumberInformation & numberEnum &&
            !isSingleFlag(numberInformation)
              ? "var(--border-hinted)"
              : numberIconStyles.strokeColour}
            numberEnum={numberEnum}
          />
          {#if crossedNumberInformation & numberEnum}
            <span class="cross-mark" aria-hidden="true">✕</span>
          {/if}
        </button>
      {/each}
    </div>
    <div class="colour-icons">
      {#each getSuits(colourInformation) as suitEnum}
        <button
          type="button"
          class="trait-icon"
          class:crossed={crossedColourInformation & suitEnum}
          title="Cross off {suitProperties[suitEnum].string}"
          on:click|stopPropagation={() => handleColourTap(suitEnum)}
          on:mousedown|stopPropagation
          on:mouseup|stopPropagation
          on:touchstart|stopPropagation
          on:touchend|stopPropagation
          on:contextmenu|preventDefault|stopPropagation
        >
          <Colour
            strokeColour={(knownColourInformation & suitEnum) &&
            !isSingleFlag(colourInformation)
              ? "var(--border-hinted)"
              : numberIconStyles.strokeColour}
            colour={suitEnum}
            isOnlyRainbow={knownColour === "rainbow"}
          />
          {#if crossedColourInformation & suitEnum}
            <span class="cross-mark" aria-hidden="true">✕</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else}
    <div
      class="menu no-{numberOfCards} {knownColour != null ? knownColour : ''}"
    >
      <p class="card-id">Card {id + 1}</p>
      <button
        class="btn menu-button {isCritical ? 'selected' : ''}"
        on:click={() => toggleCritical()}>Critical</button
      >
      <button
        class="btn menu-button {isChopMoved ? 'selected' : ''}"
        on:click={() => toggleChopMoved()}>Chop moved</button
      >
      <button
        class="btn menu-button {isFinessed ? 'selected' : ''}"
        on:click={() => toggleFinessed()}>Finessed</button
      >
      <input
        class="note-field"
        id="noteField"
        type="text"
        bind:value={note}
        placeholder="Its a..."
        on:keydown={(e) => {
          if (e.key === "Enter") toggleMode();
        }}
      />
      <button class="btn menu-button close-button" on:click={toggleMode}
        >Close</button
      >
    </div>
  {/if}
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    justify-content: center; /* Align children vertically in the center */
    align-items: center; /* Align children horizontally in the center */
    background-color: dimgray;
    color: white;
    border: 6px solid;
    border-radius: 8px;
    padding: 5px;
    cursor: pointer;
    min-width: 100px; /* Minimum width for a card */
    margin: 5px; /* Margin around cards */
    align-content: center; /* Center text inside cards */
    flex: 1;
    height: 70vh;
    min-height: 150px;
    overflow: hidden;
  }

  .card {
    transition: box-shadow 0.12s ease;
  }

  /* Selected cards get a white glow instead of a blue border. */
  .selected {
    filter: brightness(1.2);
    box-shadow: 0 0 12px 4px rgba(255, 255, 255, 0.9);
  }

  .card-id {
    height: 10%;
    width: 100%; /* Full width to fit within the card */
    padding: 4px;
    font-size: 14px; /* Slightly smaller font for the note display */
    word-wrap: break-word; /* Ensures long words do not overflow */
    overflow: hidden; /* Hides text that overflows the y-axis */
    text-overflow: ellipsis; /* Adds an ellipsis to indicate text overflow */
    display: block;
    max-height: 4.2em; /* Maximum height to show three lines */
    margin-bottom: 10px; /* Space below the note for clarity */
  }

  .rainbow {
    background-image: linear-gradient(
      to bottom right,
      red,
      orange,
      yellow,
      green,
      blue,
      indigo,
      violet
    );
    color: white;
    text-shadow:
      -1px -1px 0 #000,
      1px -1px 0 #000,
      -1px 1px 0 #000,
      1px 1px 0 #000; /* Black text shadow to create outline effect */
  }

  .black {
    background-color: #000;
    color: white;
  }

  .black.selected {
    background-color: #151515;
  }

  .red {
    background-color: #c00;
    color: white;
  }

  .blue {
    background-color: midnightblue;
    color: white;
  }

  .green {
    background-color: darkgreen;
    color: white;
  }

  .teal {
    background-color: teal;
    color: white;
  }

  .white {
    background-color: whitesmoke;
    color: black;
  }

  .yellow {
    background-color: gold;
    color: black;
  }

  .card.no-3 {
    width: calc(100% / 3 - 2px);
    aspect-ratio: 3/4;
  }

  .card.no-4 {
    width: calc(100% / 4 - 2px);
    aspect-ratio: 3/4;
  }

  .card.no-5 {
    width: calc(100% / 5 - 2px);
    aspect-ratio: 3/4;
  }

  .card .card-id {
    height: 10%;
    display: flex;
    align-items: center; /* Center the content vertically */
    justify-content: center; /* Center the content horizontally */
  }

  .card .number-icons {
    height: 32%;
    display: flex;
    flex-wrap: nowrap; /* Prevent wrapping for number icons */
    align-items: center;
    justify-content: center;
    width: 100%; /* adding this fixed the number icons but not the colour icons */
  }

  /* Number glyphs are capped in height so they don't dwarf the colour pips,
     but each also gets an equal share of the row width and shrinks to fit it
     when there are several numbers. The glyph scales to whichever constraint
     (height or its width share) is smaller, keeping them from overflowing. */
  .card .number-icons > .trait-icon {
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
  }
  .card .number-icons > .trait-icon :global(svg) {
    height: auto;
    width: auto;
    max-height: 100%;
    max-width: 100%;
  }

  .card .colour-icons {
    display: flex; /* single row, no wrapping */
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    height: 46%;
    padding-top: 5px;
  }

  /* Each colour pip takes an equal share of the row width and shrinks to fit
     when there are several. A pip is capped at ~52px (≈30% larger than the old
     35px) so a lone pip doesn't balloon to the full row height, while six pips
     shrink to share the width and stay on one line. */
  .card .colour-icons > .trait-icon {
    flex: 1 1 0;
    min-width: 0;
    max-width: 52px;
    height: 100%;
    max-height: 52px;
    margin: 0 1px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card .colour-icons > .trait-icon :global(svg) {
    width: auto;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
  }

  .number-icons > *,
  .colour-icons > * {
    flex: 1 1 auto; /* Grow to fill the space, no shrinking, no automatic basis */
    margin: 4px; /* Optional: for spacing */
    display: flex; /* To center icon content */
    justify-content: center; /* Center horizontally */
    align-items: center; /* Center vertically */
    max-width: 100%;
    max-height: 100%;
    transform: rotate(1);
    will-change: transform;
  }

  /* Tappable trait icon: transparent button wrapper around a Number/Colour icon.
     Tapping it crosses off that possibility. */
  .trait-icon {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* Only crossed-off icons need to be a positioning context for their X
     overlay; applying position to every icon shifts the flex layout. */
  .trait-icon.crossed {
    position: relative;
  }
  /* Black X overlay marking a manually crossed-off possibility. Anchored to the
     icon centre with a zero-size box so the (large) glyph never contributes to
     the flex layout and can't push a card onto a second row. */
  .cross-mark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    white-space: nowrap;
    pointer-events: none;
    color: #000;
    font-weight: 900;
    line-height: 1;
    font-size: 5.2rem;
    text-shadow:
      -2px -2px 0 #fff,
      2px -2px 0 #fff,
      -2px 2px 0 #fff,
      2px 2px 0 #fff;
  }
  @media (max-width: 600px) {
    .cross-mark {
      font-size: 3.6rem;
    }
  }
  .trait-icon:hover {
    filter: brightness(1.15);
    transform: scale(1.08);
  }
  .trait-icon:active {
    transform: scale(0.92);
    opacity: 0.6;
  }
  /* the inner svg icon shouldn't swallow the tap */
  .trait-icon > :global(*) {
    pointer-events: none;
  }

  @media (max-width: 600px) {
    .number-icons > *,
    .colour-icons > * {
      min-width: 30px; /* Smaller size for smaller screens */
      min-height: 30px;
    }
  }

  .menu-buttons {
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px; /* Space between buttons */
    width: 100%;
    height: 40%;
  }

  .note-config {
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px; /* Space between buttons */
    width: 100%;
    height: 40%;
  }

  .menu {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .menu-button {
    border: 2px solid #cccccc; /* Light grey border */
    border-radius: 5px;
    padding: 8px;
    cursor: pointer;
    width: 90%;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  .note-field {
    box-sizing: border-box;
    border: 2px solid #cccccc; /* Light grey border */
    border-radius: 2px;
    padding: 10px;
    cursor: text;
    width: 90%;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  .menu-button.selected {
    background-color: lightblue;
    color: black;
  }

  .menu-button:hover {
    filter: brightness(1.2);
    cursor: pointer;
  }
</style>
