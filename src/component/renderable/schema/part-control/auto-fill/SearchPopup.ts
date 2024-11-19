import IDictionary from "../../../../../IDictionary";
import Util from "../../../../../Util";
import { HtmlDirection, Skin } from "../../IFormMakerOptions";
import { IFixValue } from "../../IQuestionSchema";
import layout from "./assets/popup-layout.html";

export default class SearchPopup {
  private readonly _element: Element;
  private readonly _valueSelectCallback: OnValueSelectCallback;
  private readonly _url: string;
  private readonly _multi: boolean;
  private readonly _queryStrings: IDictionary<string>;
  constructor(
    url: string,
    valueSelectCallback: OnValueSelectCallback,
    multi: boolean,
    queryStrings: IDictionary<string>,
    direction: HtmlDirection,
    skin: Skin
  ) {
    this._url = url;
    this._multi = multi;
    this._queryStrings = queryStrings;
    this._valueSelectCallback = valueSelectCallback;
    this._element = Util.parse(layout).querySelector(
      "[data-bc-autocomplete-popup-container]"
    );
    this._element.setAttribute("data-bc-schema-direction", direction);
    this._element.setAttribute("data-bc-schema-skin", skin);
    const btn = this._element.querySelector("[data-bc-btn-close");
    btn.addEventListener("click", this.onCloseClick.bind(this));
    const input = this._element.querySelector("[data-bc-search]");
    input.addEventListener("keyup", this.onKeyUpAsync.bind(this));
    document.body.appendChild(this._element);
  }

  private onCloseClick(e: MouseEvent) {
    e.preventDefault();
    this._element.remove();
  }

  private async onKeyUpAsync(e: KeyboardEvent) {
    e.preventDefault();
    const term = (e.target as HTMLFormElement).value;
    const url = Util.formatString(this._url, { term, ...this._queryStrings });
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    const ul =
      this._element.querySelector<HTMLUListElement>("[data-bc-result]");
    ul.innerHTML = "";

    if (result.length > 0) {
      result.forEach((item) => {
        const li = document.createElement("li");
        li.setAttribute("data-bc-value", item.value);
        li.setAttribute("data-sys-hover", "");
        li.setAttribute("data-sys-text", "");
        li.innerHTML = item.value;
        li.addEventListener("dblclick", (e) => {
          e.preventDefault();
          if (this._valueSelectCallback(item)) {
            li.remove();
            if (!this._multi) {
              this._element.remove();
            }
          } else {
            //TODO:
          }
        });
        ul.appendChild(li);
      });
    }
  }
}

export type OnValueSelectCallback = (value: IFixValue) => boolean;
