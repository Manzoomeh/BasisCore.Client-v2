import layout from "./assets/layout_template2.html";
import itemLayout from "./assets/item-layout_template2.html";
import Question from "../../../question/Question";
import { IPartCollection } from "../../../IAnswerSchema";
import { IFixValue, IQuestionPart } from "../../../IQuestionSchema";
import SelectListType, { type } from "../SelectListType";
import RadioListType from "./RadioListType";
import Util from "../../../../../../Util";

export default class RadioListTypeTemplate2 extends RadioListType {
  protected get controlType(): type {
    return "radio";
  }
  protected get itemLayout(): string {
    return itemLayout;
  }

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }

  protected fillUI(values: Array<IFixValue>) {
    this.rndName = "radio" + (++SelectListType._seedId).toString();
    const direction = this.owner.owner.options.direction;
    let hasChecked = false;
    const filteredValues = values.filter(function(el) { return el.id > 0; });
    const lengthItems = filteredValues.length;
    const activeButton = this.element.querySelector("[data-bc-part-radio-tab-active]") as HTMLElement;

    filteredValues.forEach((item, i) => {
      const answerItem = this.answer?.values.find((x) => x.value == item.id);
      const checked = this.answer
        ? answerItem ?? false
        : item.selected ?? false;

      const newTemplate = (this.itemLayout as any)
        .replace("@type", this.controlType)
        .replace("@title", item.value)
        .replaceAll("@value", item.id.toString())
        .replaceAll("@name", this.controlType == "radio" ? this.rndName : "")
        .replace("@checked", checked ? "checked" : "")
        .replace("@disabled", this.isDisabled ? "disabled" : "")
        .replace("@disabled", this.isReadonly ? "readonly" : "");

      const template = Util.parse(newTemplate).querySelector("div");
      template.style.width = `calc(100% / ${lengthItems})`;

      this.element.querySelector("[data-bc-items]").appendChild(template);
      super.manageHasSubSchema(template, checked, item, answerItem);

      const label = template.querySelector("label");
      const container = label.closest("[data-bc-part-radio-tab-container]");
      if (checked) {
        label.setAttribute("tab-button-status", "active");
        if (direction == "ltr") {
          (container.querySelector("[data-bc-part-radio-tab-active]") as HTMLElement).style.transform = `translateX(${i}00%)`;
        } else {
          (container.querySelector("[data-bc-part-radio-tab-active]") as HTMLElement).style.transform = `translateX(-${i}00%)`;
        }
        hasChecked = true;
      }
      label.addEventListener("click", (e) => {
        const tabButton = container.querySelectorAll("[data-bc-part-radio-tab-button]");
        let left = 0;

        tabButton.forEach((btn, index) => {
          btn.setAttribute("tab-button-status", "");
          if (btn == label) {
            left = index;
          }
        });
        label.setAttribute("tab-button-status", "active");

        if (direction == "ltr") {
          activeButton.style.transform = `translateX(${left}00%)`;
        } else {
          activeButton.style.transform = `translateX(-${left}00%)`;
        }
      });
    });

    if (!hasChecked) {
      activeButton.style.transform = `translateX(-10000%)`;
    }

    activeButton.style.width = `calc((100% - 10px) / ${lengthItems})`;
  }
}
