import m from 'mithril';

import issueList from './page/issueList';
import issueMap from './page/issueMap';
import zoneModal from './component/zoneModal';
import issueDetail from './component/issueDetail';
import instance from './model/instance';


export default function (navigateTo) {
  m.route(document.body, '/undefined/issue/list', {
    "/:zone/issue/list": routeResolverBuilder(saveRoute, needZone, issueList),
    "/:zone/issue/map": routeResolverBuilder(saveRoute, needZone, issueMap),
    "/:zone/issue/detail/:id": routeResolverBuilder(needZone,
      function (args, requestedPath, route) {
        backHistory();
        issueDetail.zone = args.zone;
        issueDetail.id = args.id;
        issueDetail.open();
      }),
    "/settings/zone": {
      onmatch: function (args, requestedPath, route) {
        backHistory();
        zoneModal.open();
      },
    },
    "/settings/zone/:zone": routeResolverBuilder(needZone,
      function (args, requestedPath, route) {
        zoneModal.setInstance(args.zone);
        backHistory();
      })
  });

  if (navigateTo !== undefined) {
    m.route.set(navigateTo);
  }
}


function routeResolverBuilder(...middlewares) {
  return {
    onmatch: function (args, requestedPath, route) {
      for (var m in middlewares) {
        if (typeof middlewares[m] == "function") {
          var result = middlewares[m](args, requestedPath, route);
          if (result !== undefined) {
            return result;
          }
        } else {
          return middlewares[m];
        }
      }
    }
  };
}

var lastroute = {}
function saveRoute(args, requestedPath, route) {
  lastroute = {
    args: args,
    requestedPath: requestedPath,
    route: route,
  };
}

var wasRedirected = false;
function backHistory() {
  wasRedirected = true;
  if (lastroute === {}) {
    debugger;
    m.route.set("/:zone/issue/list", {zone: instance.current.key});
  } else {
    var args = lastroute.args;
    if (args !== undefined && args.zone !== undefined) {
      args.zone = instance.current.key;
    }
    m.route.set(lastroute.route, args);
  }
}

function needZone(args, requestedPath, route) {
  if (wasRedirected){
    wasRedirected = false;
    return;
  }
  if (instance.current.key === undefined && args.zone == "undefined") {
    m.route.set("/settings/zone")
  } else if (args.zone != "undefined") {
    instance.current = args.zone;
    if (instance.current.key != args.zone) {
      // Wrong key
      m.route.set("/settings/zone")
    }
  } else if (instance.current.key !== undefined && args.zone == "undefined") {
    backHistory();
  }
}