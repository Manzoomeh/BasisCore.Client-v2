class BasisCoreTag extends HTMLElement {
  setOwner(owner) {
    this.owner = owner;
  }

  disconnectedCallback() {
    if (!this.owner.disposed) {
      this.owner.disposeAsync();
    }
  }

  // connectedCallback() {
  //   console.log("connect", this.owner);
  // }
}

window.customElements.define("basis-core", BasisCoreTag);
