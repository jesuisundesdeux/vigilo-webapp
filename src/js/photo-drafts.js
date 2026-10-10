/**
 * Photo drafts (mobile): photos taken with the phone's camera from the list (button next
 * to "+"), kept on the phone with the phone's position at shooting time, then turned into
 * an observation later. Android removes the GPS position of every photo handed to a web
 * page (issue #128): the position comes from the browser's geolocation, not from the photo.
 *
 * Stored in IndexedDB (database "vigilo-drafts", store "drafts"):
 * { id, instance, image (JPEG Blob), lat, lon, accuracy, date (ms) }
 */
import $ from 'jquery';
import i18next from 'i18next';
import M from '@materializecss/materialize';
import * as vigiloconfig from './vigilo-config';
import { escapeHtml } from './utils';

const DB_NAME = "vigilo-drafts";
const STORE = "drafts";
// same largest side as the photos sent to the backend
const MAX_SIZE = 1500;
const JPEG_QUALITY = 0.9;

var dbPromise = null;

function db() {
  if (dbPromise === null) {
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function run(mode, action) {
  return db().then((database) => new Promise((resolve, reject) => {
    var tx = database.transaction(STORE, mode);
    var request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
  }));
}

function instanceName() {
  var instance = vigiloconfig.getInstance();
  return instance ? instance.name : "";
}

/** Drafts of the current instance, most recent first */
export function listDrafts() {
  return run("readonly", (store) => store.getAll())
    .then((all) => (all || []).filter((d) => d.instance == instanceName()).sort((a, b) => b.date - a.date))
    .catch(() => []);
}

export function getDraft(id) {
  return run("readonly", (store) => store.get(id));
}

export function deleteDraft(id) {
  return run("readwrite", (store) => store.delete(id)).then(refreshCount);
}

function saveDraft(draft) {
  // ask the browser not to clear the drafts when space runs low
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
  return run("readwrite", (store) => store.add(draft)).then(refreshCount);
}

/** Phone position: Promise of {lat, lon, accuracy}, or null */
function phonePosition(maximumAge, timeout) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: maximumAge, timeout: timeout });
  });
}

// The most accurate of the available positions
function bestPosition(positions) {
  return Promise.all(positions).then((list) => list.filter((p) => p)
    .sort((a, b) => a.accuracy - b.accuracy)[0] || null);
}

/** Photo reduced to MAX_SIZE (the browser applies the EXIF orientation when drawing it) */
function reduce(file) {
  return new Promise((resolve, reject) => {
    var url = URL.createObjectURL(file);
    var image = new Image();
    image.onload = () => {
      var scale = Math.min(1, MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("JPEG export failed")), "image/jpeg", JPEG_QUALITY);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unreadable image"));
    };
    image.src = url;
  });
}

// Position asked when the camera opens (the page may be paused while the camera app is shown)
var positionAtClick = null;

function takePhoto() {
  positionAtClick = phonePosition(0, 30000);
  // synchronous: the camera only opens from a user gesture
  $("#draft-camera-input").val("").trigger("click");
}

async function onPhoto(file) {
  var date = Date.now();
  // the position asked at click, or one asked now (back from the camera, at the same place)
  var position = bestPosition([positionAtClick || Promise.resolve(null), phonePosition(30000, 15000)]);
  positionAtClick = null;
  try {
    var image = await reduce(file);
    var pos = await position;
    await saveDraft({
      instance: instanceName(),
      image: image,
      lat: pos ? pos.lat : null,
      lon: pos ? pos.lon : null,
      accuracy: pos ? pos.accuracy : null,
      date: date
    });
    M.toast({ html: escapeHtml(i18next.t("drafts-saved")) });
  } catch (e) {
    console.error(e);
    M.toast({ html: escapeHtml(i18next.t("drafts-save-failed")), classes: "red" });
  }
}

// Number of drafts on the gallery button (hidden without draft)
function refreshCount() {
  return listDrafts().then((drafts) => {
    $("#drafts-btn").toggleClass("hide", drafts.length == 0);
    $("#drafts-btn .drafts-count").text(drafts.length);
  });
}

var objectUrls = [];

async function renderGallery() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
  var drafts = await listDrafts();
  var grid = $("#modal-drafts .drafts-grid").empty();
  $("#modal-drafts .drafts-empty").toggleClass("hide", drafts.length > 0);
  var lang = i18next.language.split("_")[0];
  drafts.forEach((d) => {
    var url = URL.createObjectURL(d.image);
    objectUrls.push(url);
    var when = new Date(d.date).toLocaleString(lang, { dateStyle: "short", timeStyle: "short" });
    var where = d.lat !== null ? "± " + Math.round(d.accuracy) + " m" : i18next.t("drafts-no-position");
    var item = $(`<div class="draft">
        <a href="#!" class="draft-open"><img alt=""></a>
        <div class="draft-caption"><span class="draft-date"></span><span class="draft-where"></span></div>
        <a href="#!" class="draft-delete"><i class="material-icons">delete</i></a>
      </div>`);
    item.attr("data-id", d.id);
    item.find("img").attr("src", url);
    item.find(".draft-date").text(when);
    item.find(".draft-where").text(where).toggleClass("missing", d.lat === null);
    item.find(".draft-open").attr({ title: i18next.t("drafts-open"), "aria-label": i18next.t("drafts-open") });
    item.find(".draft-delete").attr({ title: i18next.t("drafts-delete"), "aria-label": i18next.t("drafts-delete") });
    grid.append(item);
  });
}

// Image of a draft as a data URL (loaded in the form like a picked photo)
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function initPhotoDrafts() {
  if (!window.WE_ARE_ON_A_MOBILE || !window.indexedDB) {
    return;
  }
  $("#draft-camera-btn").removeClass("hide").on("click", (e) => {
    e.preventDefault();
    takePhoto();
  });
  $("#draft-camera-input").on("change", function () {
    if (this.files && this.files[0]) {
      onPhoto(this.files[0]);
    }
  });
  var modal = M.Modal.init($("#modal-drafts")[0], { onOpenStart: renderGallery });
  $("#modal-drafts .drafts-take").on("click", (e) => {
    e.preventDefault();
    modal.close();
    takePhoto();
  });
  $("#modal-drafts .drafts-grid").on("click", ".draft-delete", function (e) {
    e.preventDefault();
    var id = Number($(this).closest(".draft").attr("data-id"));
    if (window.confirm(i18next.t("drafts-delete-confirm"))) {
      deleteDraft(id).then(renderGallery);
    }
  }).on("click", ".draft-open", async function (e) {
    e.preventDefault();
    var draft = await getDraft(Number($(this).closest(".draft").attr("data-id")));
    if (!draft) {
      return;
    }
    modal.close();
    window.startFormFromDraft(Object.assign({}, draft, { image: await blobToDataURL(draft.image) }));
  });
  refreshCount();
}
