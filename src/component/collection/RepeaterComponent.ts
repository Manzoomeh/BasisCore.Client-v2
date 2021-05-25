import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  readonly template: DocumentFragment;
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  protected async renderSourceAsync(
    dataSource: IDataSource
  ): Promise<DocumentFragment> {
    const retVal = document.createDocumentFragment();
    for (let index = 0; index < dataSource.data.Rows.length; index++) {
      const row = dataSource.data.Rows[index];
      const newContent = this.content.firstChild.cloneNode(true);
      const childList = [...newContent.childNodes];
      retVal.appendChild(newContent);
      const collection = new ComponentCollection(childList, this.context);
      await collection.initializeAsync();
      await collection.runAsync();
    }
    return retVal;
  }
}

//   protected async renderSourceAsync(
//     dataSource: IDataSource
//   ): Promise<DocumentFragment> {
//     const retVal = document.createDocumentFragment();
//     for (let index = 0; index < dataSource.data.Rows.length; index++) {
//       const row = dataSource.data.Rows[index];
//       const newContent = this.content.firstChild.cloneNode(true);
//       const content = document.createDocumentFragment();

//       const childList = new Array<ChildNode>();
//       while (newContent.hasChildNodes()) {
//         var child = content.appendChild(newContent.firstChild);
//         childList.push(child);
//       }
//       const collection = new ComponentCollection(childList, this.context);
//       await collection.initializeAsync();
//       await collection.runAsync();
//       retVal.appendChild(content);
//     }
//     console.log(dataSource, retVal);
//     return retVal;
//   }
// }
