import { useReducer } from "react";

// ── Action Types ────────────────────────────────────────────
export const RESET = "RESET";
export const SET_SCREEN = "SET_SCREEN";
export const UPDATE_ITEM = "UPDATE_ITEM";
export const UPDATE_META = "UPDATE_META";
export const SET_ITEM_AND_SCREEN = "SET_ITEM_AND_SCREEN";
export const SET_META_AND_SCREEN = "SET_META_AND_SCREEN";

// Resolve intelligence outcomes
export const RESOLVE_EXISTING_MISMATCH = "RESOLVE_EXISTING_MISMATCH";
export const RESOLVE_EXISTING_MATCH = "RESOLVE_EXISTING_MATCH";
export const RESOLVE_NEW_ITEM = "RESOLVE_NEW_ITEM";

// Photo flow
export const PHOTO_PREVIEW = "PHOTO_PREVIEW";
export const AI_RESULT = "AI_RESULT";
export const AI_ERROR = "AI_ERROR";

// Barcode scan flow
export const SCAN_START = "SCAN_START";
export const SCAN_DONE = "SCAN_DONE";
export const SCAN_PRODUCT_FOUND = "SCAN_PRODUCT_FOUND";
export const SCAN_AI_RESULT = "SCAN_AI_RESULT";
export const SCAN_NOT_FOUND = "SCAN_NOT_FOUND";
export const SCAN_ERROR = "SCAN_ERROR";
export const SCAN_STOP = "SCAN_STOP";

// Bill scan flow
export const BILL_PREVIEW = "BILL_PREVIEW";
export const BILL_RESULT = "BILL_RESULT";
export const BILL_ERROR = "BILL_ERROR";

// Save & external entry
export const SAVE_COMPLETE = "SAVE_COMPLETE";
export const INIT_FROM_SEARCH = "INIT_FROM_SEARCH";
export const INIT_FROM_SHELF = "INIT_FROM_SHELF";

// ── Initial State ───────────────────────────────────────────
export function initialState() {
  return {
    screen: "choose",
    item: {
      name: "", brand: "", category: "", qty: 1, unit: "Pcs",
      reorder: 1, price: "", expiry: "", emoji: "📦", imagePreview: null,
    },
    meta: {
      unitSource: null, existingStock: null, unitMismatch: null,
      selSpace: null, selShelf: null,
      scanning: false, scanDone: false,
      aiResult: null, scanError: null, aiError: null,
      billItems: [], billImagePreview: null, billError: null,
    },
  };
}

// ── Reducer ─────────────────────────────────────────────────
export function addReducer(state, action) {
  switch (action.type) {

    // ── Generic ───────────────────────────────────────────
    case RESET:
      return initialState();

    case SET_SCREEN:
      return { ...state, screen: action.screen };

    case UPDATE_ITEM:
      return { ...state, item: { ...state.item, ...action.fields } };

    case UPDATE_META:
      return { ...state, meta: { ...state.meta, ...action.fields } };

    case SET_ITEM_AND_SCREEN:
      return { ...state, item: { ...state.item, ...action.fields }, screen: action.screen };

    case SET_META_AND_SCREEN:
      return { ...state, meta: { ...state.meta, ...action.fields }, screen: action.screen };

    // ── Resolve intelligence ──────────────────────────────
    case RESOLVE_EXISTING_MISMATCH:
      return {
        ...state,
        meta: { ...state.meta, unitSource: action.unitSource, unitMismatch: action.unitMismatch, existingStock: action.existingStock },
        item: { ...state.item, unit: action.unit },
        screen: "unit_mismatch",
      };

    case RESOLVE_EXISTING_MATCH:
      return {
        ...state,
        meta: { ...state.meta, unitSource: action.unitSource, existingStock: action.existingStock },
        item: { ...state.item, unit: action.unit },
        screen: "stock_add_confirm",
      };

    case RESOLVE_NEW_ITEM:
      return {
        ...state,
        meta: { ...state.meta, unitSource: action.unitSource },
        item: { ...state.item, unit: action.unit, category: action.category || state.item.category },
        screen: action.screen,
      };

    // ── Photo / AI flow ───────────────────────────────────
    case PHOTO_PREVIEW:
      return {
        ...state,
        item: { ...state.item, imagePreview: action.imagePreview },
        screen: "ai_analyzing",
      };

    case AI_RESULT:
      return {
        ...state,
        meta: { ...state.meta, aiResult: action.aiResult },
        item: { ...state.item, ...action.itemFields },
        screen: "review_details",
      };

    case AI_ERROR:
      return {
        ...state,
        meta: { ...state.meta, aiError: action.aiError },
        screen: "review_details",
      };

    // ── Barcode scan flow ─────────────────────────────────
    case SCAN_START:
      return { ...state, meta: { ...state.meta, scanning: true, scanError: null } };

    case SCAN_DONE:
      return { ...state, meta: { ...state.meta, scanning: false, scanDone: true } };

    case SCAN_PRODUCT_FOUND:
      return { ...state, item: { ...state.item, ...action.itemFields } };

    case SCAN_AI_RESULT:
      return {
        ...state,
        item: { ...state.item, ...action.itemFields },
        meta: { ...state.meta, aiResult: action.aiResult },
      };

    case SCAN_NOT_FOUND:
      return {
        ...state,
        item: { ...state.item, ...action.itemFields },
        meta: { ...state.meta, aiError: action.aiError },
      };

    case SCAN_ERROR:
      return { ...state, meta: { ...state.meta, scanning: false, scanError: action.scanError } };

    case SCAN_STOP:
      return { ...state, meta: { ...state.meta, scanning: false } };

    // ── Bill scan flow ────────────────────────────────────
    case BILL_PREVIEW:
      return {
        ...state,
        meta: { ...state.meta, billImagePreview: action.imagePreview, billError: null },
        screen: "bill_analyzing",
      };

    case BILL_RESULT:
      return {
        ...state,
        meta: { ...state.meta, billItems: action.billItems },
        screen: "bill_review",
      };

    case BILL_ERROR:
      return {
        ...state,
        meta: { ...state.meta, billError: action.billError },
        screen: "bill",
      };

    // ── Save & external entry ─────────────────────────────
    case SAVE_COMPLETE:
      return { ...state, screen: "saved" };

    case INIT_FROM_SEARCH:
      return { ...initialState(), item: { ...initialState().item, name: action.name }, screen: "manual" };

    case INIT_FROM_SHELF:
      return { ...initialState(), meta: { ...initialState().meta, selSpace: action.selSpace, selShelf: action.selShelf }, screen: "manual" };

    default:
      return state;
  }
}

// ── Hook ────────────────────────────────────────────────────
export default function useAddReducer() {
  return useReducer(addReducer, undefined, initialState);
}
