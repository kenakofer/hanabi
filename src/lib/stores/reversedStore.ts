import { createPersistentStore } from "./persistentStore";

// Default true so newly drawn cards appear on the LEFT (H-group convention,
// see plan.md). Users can toggle this in the config modal.
const reversedStore =  createPersistentStore("reversedStore", true);

export { reversedStore };