// Fixture for $bc.util.getComponentAsync with host.repositories["demo.widget"]:
// the script must define the global path named by the key.
window.demo = window.demo || {};
window.demo.widget = class DemoWidget {
  constructor(owner) {
    this.owner = owner;
  }
};
