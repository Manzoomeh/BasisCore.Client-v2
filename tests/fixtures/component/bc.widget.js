/*
 * Repository script for tests/commands/component.html.
 * host.repositories maps the prefix "bc" to this file; the library evaluates the FULL key
 * (`bc.widget`) once the script has loaded, so the constructor must live at that global path.
 */
window.bc = window.bc || {};
bc.widget = class {
  constructor(owner) {
    this.owner = owner;
  }
  async runAsync() {
    const label = await this.owner.getAttributeValueAsync("label", "widget");
    this.owner.setContent(this.owner.toNode(`<span class="widget">${label} from repository</span>`));
  }
};
