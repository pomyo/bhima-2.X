angular.module('bhima.controllers')
.controller('InventoryTypesController', InventoryTypesController);

// dependencies injection
InventoryTypesController.$inject = [
  'InventoryTypeService', 'NotifyService', 'ModalService'
];

/**
 * Inventory Type Controller
 * This controller is responsible for handling inventory type module
 */
function InventoryTypesController(InventoryType, Notify, Modal) {
  var vm = this;

  // expose to the view
  vm.addInventoryType = addInventoryType;
  vm.editInventoryType = editInventoryType;

  // startup
  startup();

  /** add inventory type */
  function addInventoryType() {
    var request = { action : 'add' };

    Modal.openInventoryTypeActions(request)
    .then(function (res) {
      if (res.id) {
        Notify.success('FORM.INFOS.CREATE_SUCCESS');
      }
    })
    .then(startup)
    .catch(Notify.errorHandler);
  }

  /** edit inventory type */
  function editInventoryType(id) {
    var request = { action : 'edit', identifier : id };

    Modal.openInventoryTypeActions(request)
    .then(function (res) {
      Notify.success('FORM.INFOS.UPDATE_SUCCESS');
    })
    .then(startup)
    .catch(Notify.errorHandler);
  }

  /** initializes the view */
  function startup() {
    // get inventory types
    InventoryType.read()
    .then(function (list) {
      vm.typeList = list;
    })
    .catch(Notify.errorHandler);
  }

}
