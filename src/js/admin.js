import i18next from 'i18next';
import localDataManager from './localDataManager';
import * as vigilo from './vigilo-api';
import { randomToken } from './utils';

var key = "";

export async function init() {

  // listen 15 clicks on side menu vigilo logo to open modal if no key
  var modal = M.Modal.init($("#modal-admin"));
  var count = 0;
  var count_expected= 10;
  $("#mobile-menu a[href='#user']").click(() => {
    count++;
    if (count >= count_expected) {
      M.Modal.getInstance($("#modal-admin")).open();
    }
  })

  // button handler in admin modal
  $("#modal-admin #generate-key").click(() => {
    var generated = randomToken("AZERTYUIOPQSDFGHJKLMWXCVBN1234567890", 40);
    $("#modal-admin input").val(generated);
    M.updateTextFields();
  });
  $("#modal-admin #save-key").click(() => {
    localDataManager.setAdminKey($("#modal-admin input").val());
    window.location.reload();
  })

  // Personal key in localStorage ?
  key = localDataManager.getAdminKey();
  if (key !== null && key != undefined && key.length > 0) {
    $("#modal-admin input").val(key);
    count_expected = 0; // No need to wait 10 clicks to open admin modal
  } else {
    return
  }


  // Valid role (admin) ?
  var acl={}
  try {
    acl = await vigilo.acl(key);
  } catch (e) {}
  if (acl.role == "admin" || acl.role == "moderator"){
    // Is admin mode ?
    if (localDataManager.isAdmin()){
      document.body.style.backgroundColor="red";
      $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">stars</i> <span data-i18n="moderator-disable">'+i18next.t("moderator-disable")+'</span></a></li>');
      $("#admin-status a").click(()=>{
        localDataManager.setIsAdmin(false);
        window.location.reload()
      })
      initAdmin();
    } else {
      $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">stars</i> <span data-i18n="moderator-enable">'+i18next.t("moderator-enable")+'</span></a></li>');
      $("#admin-status a").click(()=>{
        localDataManager.setIsAdmin(true);
        window.location.reload()
      })
    }
    
  } else {
    // Pending ...
    $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">star_half</i> <span data-i18n="moderator-pending">'+i18next.t("moderator-pending")+'</span></a></li>');
    $("#admin-status a").click(()=>{M.Modal.getInstance($("#modal-admin")).open();})
    localDataManager.setIsAdmin(false);
  }

  
}


function initAdmin(){
  window.adminApprove = async function(token, status){
    // 0 = back to moderation queue, 2 = refused: both hide the observation (issue #110)
    var confirmKey = {"0": "moderation-confirm-unapprove", "2": "moderation-confirm-refuse"}[status];
    if (confirmKey !== undefined && !window.confirm(i18next.t(confirmKey))) {
      return;
    }
    await vigilo.approve(localDataManager.getAdminKey(), token, status);
    window.location.reload()
  }
}
