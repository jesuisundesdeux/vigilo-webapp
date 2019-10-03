import localDataManager from './localDataManager';
import * as vigilo from './vigilo-api';

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
    const alphabet = "AZERTYUIOPQSDFGHJKLMWXCVBN1234567890";
    const length = 40;
    var generated = "";
    for (var i = 0; i < length; i++) {
      generated += alphabet[Math.floor(Math.random() * Math.floor(alphabet.length))];
    }
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
  if (acl.role == "admin"){
    // Is admin mode ?
    if (localDataManager.isAdmin()){
      document.body.style.backgroundColor="red";
      $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">stars</i> Désactiver mode admin</a></li>');
      $("#admin-status a").click(()=>{
        localDataManager.setIsAdmin(false);
        window.location.reload()
      })
      initAdmin();
    } else {
      $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">stars</i> Activer mode admin</a></li>');
      $("#admin-status a").click(()=>{
        localDataManager.setIsAdmin(true);
        window.location.reload()
      })
    }
    
  } else {
    // Pending ...
    $("#admin-status").empty().append('<li><a class="waves-effect grey-text"><i class="material-icons">star_half</i> Presque modérateur</a></li>');
    $("#admin-status a").click(()=>{M.Modal.getInstance($("#modal-admin")).open();})
    localDataManager.setIsAdmin(false);
  }

  
}


function initAdmin(){
  window.adminApprove = async function(token, status){
    await vigilo.approve(localDataManager.getAdminKey(), token, status);
    window.location.reload()
  }
}
