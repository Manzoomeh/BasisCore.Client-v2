import Question from "../../question/Question";
import layout from "./assets/auto-complete-single-type.html";
import SearchPopup from "./SearchPopup";
import "./assets/style";
import AutoCompleteType from "./AutoCompleteType";
import { IQuestionPart, IPartCollection, IFixValue } from "../../ISchema";

export default class AutoCompleteSingleType extends AutoCompleteType {
  private _btn: HTMLButtonElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._btn = this.element.querySelector("[data-bc-btn]");
    if (!owner.options.viewMode) {
      this._btn.addEventListener("click", this.onShowPopUpBtnClick.bind(this));
    } else {
      this._btn.remove();
    }
    const value = answer?.values[0];
    if (value) {
      this.getValueAsync(value.value).then((fixValue) =>
        this.setValue(fixValue)
      );
    }
  }

  private onShowPopUpBtnClick(e: MouseEvent) {
    e.preventDefault();
    if (this._btn.getAttribute("data-bc-btn") === "add") {
      const t = new SearchPopup(
        this.part.link,
        this.setValue.bind(this),
        false
      );
    } else {
      this.selectedId = null;
      this.element.querySelector("label").innerHTML = "";
      this._btn.setAttribute("data-bc-btn", "add");
    }
  }

  protected setValue(value: IFixValue): boolean {
    const changed = super.setValue(value);
    if (changed) {
      this._btn.setAttribute("data-bc-btn", "remove");
    }
    return changed;
  }
}
