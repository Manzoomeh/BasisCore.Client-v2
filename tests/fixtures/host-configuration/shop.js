/*
 * Component library loaded through `host.repositories["shop"]`.
 * The global named by the full component key (`shop.cart`) must exist after the script runs.
 */
window.shop = window.shop || {};
window.shop.cart = class ShopCart {
  constructor(owner) {
    this.owner = owner;
  }
  async initializeAsync() {
    const label = await this.owner.getAttributeValueAsync("label", "cart");
    this.owner.setContent(this.owner.toNode('<span class="cart">' + label + " from shop.js</span>"));
  }
};
