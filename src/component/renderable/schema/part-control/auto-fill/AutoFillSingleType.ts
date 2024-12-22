import Question from "../../question/Question";
import layout from "./assets/auto-fill-single-type.html";
import SearchPopup from "./SearchPopup";
import "./assets/style";
import AutoFillType from "./AutoFillType";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../../IQuestionSchema";

export default class AutoFillSingleType extends AutoFillType {
  private _btn: HTMLButtonElement;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    this._btn = this.element.querySelector("[data-bc-btn]");
    if (owner.options.displayMode != "view" && !owner.question.disabled) {
      this._btn.addEventListener("click", this.onShowPopUpBtnClick.bind(this));
    } else {
      (this.element.querySelector("[data-bc-auto-complete-single-type]") as HTMLElement).style.width = "100%";
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
    this.getQueryStringParamsAsync()
      .then((x) => {
        if (this._btn.getAttribute("data-bc-btn") === "add") {
          const popup = new SearchPopup(
            this.part.link,
            this.setValue.bind(this),
            false,
            x,
            this.owner.options.direction,
            this.owner.options.skin
          );
        } else {
          this.selectedId = null;
          this.element.querySelector("label").innerHTML = "";
          this._btn.setAttribute("data-bc-btn", "add");
          this._btn.removeAttribute("data-sys-minus");
          this._btn.setAttribute("data-sys-plus", "");
          this._btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-plus-icon="" d="M8.4 0H5.6V5.6H0V8.4H5.6V14H8.4V8.4H14V5.6H8.4V0Z" fill="#004B85"/></svg>`;
        }
      })
      .catch((error) => {
        //Has empty required part!
      });
  }

  protected setValue(value: IFixValue): boolean {
    const changed = super.setValue(value);
    if (changed) {
      this._btn.setAttribute("data-bc-btn", "remove");
      this._btn.removeAttribute("data-sys-plus");
      this._btn.setAttribute("data-sys-minus", "");
      this._btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path data-sys-minus-icon="" d="M2.04028 0.0603034L0.0603845 2.0402L4.02018 6L0.0603845 9.9598L2.04028 11.9397L6.00008 7.9799L9.95988 11.9397L11.9398 9.9598L7.97998 6L11.9398 2.0402L9.95988 0.0603037L6.00008 4.0201L2.04028 0.0603034Z" fill="#B40020"></path></svg>`;
    }
    return changed;
  }
}
