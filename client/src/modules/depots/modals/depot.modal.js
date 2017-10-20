angular.module('bhima.controllers')
  .controller('DepotModalController', DepotModalController);

DepotModalController.$inject = [
  '$state', 'DepotService', 'ModalService', 'NotifyService', 'AppCache',
];

function DepotModalController($state, Depots, ModalService, Notify, AppCache) {
  var vm = this;

  vm.depot = $state.params.depot;
  vm.isCreating = !!($state.params.creating);

  // exposed methods
  vm.submit = submit;
  vm.closeModal = closeModal;

  // submit the data to the server from all two forms (update, create)
  function submit(depotForm) {
    var promise;

    var stockEntryCache = new AppCache('StockEntry');
    var stockExitCache = new AppCache('StockExit');

    // remove depot from caches
    delete stockEntryCache.depot;
    delete stockExitCache.depot;

    if (depotForm.$invalid || depotForm.$pristine) { return 0; }

    promise = (vm.isCreating) ?
      Depots.create(vm.depot) :
      Depots.update(vm.depot.uuid, vm.depot);

    return promise
      .then(function () {
        var translateKey = (vm.isCreating) ? 'DEPOT.CREATED' : 'DEPOT.UPDATED';
        Notify.success(translateKey);
        $state.go('depots', null, { reload : true });
      })
      .catch(Notify.handleError);
  }

  function closeModal() {
    $state.go('depots');
  }
}
