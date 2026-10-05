/*
 * Component library loaded through `host.repositories["shop.reports"]`; the longer prefix wins
 * over `shop` for every `shop.reports.*` key.
 */
window.shop = window.shop || {};
window.shop.reports = window.shop.reports || {};
window.shop.reports.summary = class ReportSummary {
  constructor(owner) {
    this.owner = owner;
  }
  async initializeAsync() {
    this.owner.setContent(this.owner.toNode('<span class="summary">summary from reports.js</span>'));
  }
};
