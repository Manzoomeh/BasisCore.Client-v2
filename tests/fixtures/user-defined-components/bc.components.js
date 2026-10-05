/*
 * One repository script serving two components under the "bc" prefix
 * (tests/foundations/user-defined-components.html). It is downloaded once per page.
 */
window.bc = window.bc || {};
bc.badge = class {
  constructor(owner) {
    this.owner = owner;
  }
  async runAsync(source) {
    source = source ?? this.owner.tryToGetSource("repo.items");
    const count = source?.rows.length ?? 0;
    this.owner.setContent(this.owner.toNode(`<span class="repo-badge">${count}</span>`));
  }
};
bc.stamp = class {
  constructor(owner) {
    this.owner = owner;
  }
  async runAsync() {
    this.owner.setContent(this.owner.toNode(`<span class="repo-stamp">stamped</span>`));
  }
};
