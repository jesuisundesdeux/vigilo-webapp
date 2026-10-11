/**
 * Moderators: key of the instance (one key per instance, see localDataManager), checked with
 * acl.php; banner under the top bar, shortcut of the side menu (observations to moderate only /
 * back to all), settings window (enter or generate a key, change it, remove it, turn the
 * moderator mode off or on) and moderation of an observation (window.moderate).
 */
import i18next from 'i18next';
import localDataManager from './localDataManager';
import dataManager from './dataManager';
import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import { randomToken } from './utils';
import { refreshIssueCard } from './issue-list';
import { applyFilters } from './issue-filter';
import * as map from './issue-map';

const MODAL = "#modal-moderator";
// Filters of the "observations to moderate" shortcut, and the ones in use before it
const QUEUE_FILTERS = { dow: [], hour: [], categories: [], status: ['unapproved'], age: "all", onlyme: false, cities: [], comment: "" };
var previousFilters = null;

/** State of the key: none, pending (not recognised by the instance), active, off, error (not checked) */
async function keyState(key) {
  if (!key) {
    return "none";
  }
  try {
    var acl = await vigilo.acl(encodeURIComponent(key));
    if (acl.role == "admin" || acl.role == "moderator") {
      return localDataManager.isModerationOff() ? "off" : "active";
    }
    return "pending";
  } catch (e) {
    return "error";
  }
}

export async function init() {
  var key = localDataManager.getModeratorKey();
  var state = await keyState(key);
  localDataManager.setModerator(state == "active");

  initSettings(key, state);
  var entry = { none: "moderator-become", pending: "moderator-menu-pending", active: "moderator-menu-active", off: "moderator-menu-off", error: "moderator-menu-pending" }[state];
  $("#moderator-entry .moderator-entry-label").attr("data-i18n", entry).text(i18next.t(entry));

  if (state == "active") {
    document.documentElement.classList.add("moderator-mode");
    $("#moderator-banner").prop("hidden", false);
    initShortcut();
    window.moderate = moderate;
  }
}

function initSettings(key, state) {
  var modal = $(MODAL);
  M.Modal.init(modal[0], {
    onOpenStart: () => {
      modal.removeClass("editing");
      modal.find(".moderator-generated, .moderator-copy").addClass("hide");
      modal.find("#moderator-key").val(state == "none" ? "" : key);
      M.updateTextFields();
    }
  });
  modal.attr("data-state", state);
  var instance = (vigiloconfig.getInstance() || {}).name || "";
  modal.find(".moderator-status").text(state == "none" ? "" : i18next.t("moderator-state-" + state));
  modal.find(".moderator-instance").text(i18next.t("moderator-instance", { instance: instance }));

  function copy(value) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => M.toast({ html: i18next.t("moderator-copied") }), () => {});
    }
  }
  modal.find(".moderator-generate").on("click", () => {
    modal.find("#moderator-key").val(randomToken("AZERTYUIOPQSDFGHJKLMWXCVBN1234567890", 40));
    modal.find(".moderator-generated, .moderator-copy").removeClass("hide");
    M.updateTextFields();
  });
  modal.find(".moderator-copy").on("click", () => copy(modal.find("#moderator-key").val().trim()));
  modal.find(".moderator-copy-saved").on("click", () => copy(key));
  modal.find(".moderator-save").on("click", () => {
    var value = modal.find("#moderator-key").val().trim();
    if (!value) {
      return;
    }
    localDataManager.setModeratorKey(value);
    localDataManager.setModerationOff(false);
    window.location.reload();
  });
  modal.find(".moderator-change").on("click", () => {
    modal.addClass("editing");
    modal.find("#moderator-key").val("").trigger("focus");
    M.updateTextFields();
  });
  modal.find(".moderator-delete").on("click", () => {
    if (window.confirm(i18next.t("moderator-delete-confirm"))) {
      localDataManager.setModeratorKey("");
      window.location.reload();
    }
  });
  modal.find(".moderator-disable").on("click", () => {
    localDataManager.setModerationOff(true);
    window.location.reload();
  });
  modal.find(".moderator-enable").on("click", () => {
    // Remind moderators of their responsibilities (issue #80)
    if (window.confirm(i18next.t("moderator-warning"))) {
      localDataManager.setModerationOff(false);
      window.location.reload();
    }
  });
}

// Side menu shortcut: the observations to moderate only, then back to the previous filters with
// every status
function initShortcut() {
  var item = $("#moderation-shortcut").removeClass("hide");
  item.find("a").on("click", (e) => {
    e.preventDefault();
    if (inQueue()) {
      applyFilters(Object.assign({}, previousFilters || dataManager.filters(), { status: [] }));
      previousFilters = null;
    } else {
      previousFilters = dataManager.filters();
      applyFilters(QUEUE_FILTERS);
    }
    var tabs = M.Tabs.getInstance($("#mobile-menu .tabs")[0]);
    if (tabs) {
      tabs.select("issues");
    }
    M.Sidenav.getInstance($("#mobile-menu")[0]).close();
  });
  $(dataManager).on("filterchange", refreshShortcut);
  refreshShortcut();
}

function inQueue() {
  return dataManager.status.length == 1 && dataManager.status[0] == "unapproved";
}

async function refreshShortcut() {
  var queue = inQueue();
  var item = $("#moderation-shortcut");
  var label = queue ? "moderation-show-all" : "moderation-show-queue";
  item.find("i").text(queue ? "list" : "pending_actions");
  item.find(".moderation-shortcut-label").attr("data-i18n", label).text(i18next.t(label));
  var count = 0;
  try {
    count = (await vigilo.getIssues()).filter((i) => i.approved == 0).length;
  } catch (e) {}
  item.find(".moderation-count").text(count).toggleClass("hide", queue || count == 0);
}

async function moderate(token, status) {
  // 0 = back to moderation queue, 2 = refused: both hide the observation (issue #110)
  var confirmKey = { "0": "moderation-confirm-unapprove", "2": "moderation-confirm-refuse" }[status];
  if (confirmKey !== undefined && !window.confirm(i18next.t(confirmKey))) {
    return;
  }
  try {
    await vigilo.approve(localDataManager.getModeratorKey(), token, status);
  } catch (e) {
    M.toast({ html: i18next.t("moderation-failed"), classes: "red" });
    return;
  }
  // Update the observation in place instead of reloading the whole page, so that
  // moderators can process several observations in a row without waiting
  var issues = await vigilo.getIssues();
  var issue = issues.find((i) => i.token == token);
  if (issue !== undefined) {
    issue.approved = parseInt(status);
    await refreshIssueCard(issue);
    map.cleanIssues();
    map.displayIssues(true);
  }
  refreshShortcut();
  M.Modal.getInstance($("#modal-issue")[0]).close();
  M.toast({ html: i18next.t("moderation-done-" + status) });
}
