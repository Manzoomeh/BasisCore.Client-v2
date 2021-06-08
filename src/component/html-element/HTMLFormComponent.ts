import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLFormComponent extends HTMLElementComponent<HTMLFormElement> {
  constructor(
    @inject("element") element: HTMLFormElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  protected getSourceValueAsync(event: Event): Promise<any> {
    const data = new FormData(this.node);
    const _rootList = new Map<string, FormDataEntryValue>();
    const value = Array.from(data.keys()).reduce((result, key) => {
      const value = data.get(key);
      if (key.startsWith("_")) {
        _rootList.set(key, value);
      } else {
        result[key] = value;
      }
      return result;
    }, {});
    if (_rootList.size > 0) {
      const _roots = this.convertRootList(_rootList);
      [..._roots.keys()].forEach((key) => (value[key] = _roots.get(key)));
    }
    return Promise.resolve(value);
  }

  private convertRootList(
    values: Map<string, FormDataEntryValue>
  ): Map<string, any> {
    const retVal = new Map<string, any>();
    [...values.keys()].forEach((key) => {
      const value = values.get(key);
      const [rootKey, ...parts] = key.split(".");
      let root = retVal.get(rootKey);
      if (!root) {
        root = {};
        retVal.set(rootKey, root);
      }
      parts.forEach((part, i) => {
        const [subRoot, index] = part.split("__", 2);
        if (index) {
          let tmpRoot = root[subRoot];
          if (!tmpRoot) {
            root[subRoot] = tmpRoot = [];
          }
          let obj = tmpRoot[index];
          if (!obj) {
            tmpRoot[index] = obj = {};
          }
          root = obj;
        } else {
          if (i + 1 == parts.length) {
            root[part] = value;
          } else {
            let obj = root[part];
            if (!obj) {
              root[part] = obj = {};
            }
            root = obj;
          }
        }
      });
    });

    [...retVal.values()].forEach((root) => {
      function removeArrayEmptySlots(value: any): void {
        Object.keys(value).forEach((prop) => {
          let val = value[prop];
          if (Array.isArray(val)) {
            value[prop] = val = val.filter(String);
            val.forEach((item) => removeArrayEmptySlots(item));
          } else if (typeof val === "object") {
            removeArrayEmptySlots(val);
          }
        });
      }
      removeArrayEmptySlots(root);
    });
    return retVal;
  }
}
