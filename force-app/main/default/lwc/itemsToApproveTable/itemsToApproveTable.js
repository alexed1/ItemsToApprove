/* eslint-disable no-console */
import { LightningElement, api, track } from 'lwc';
 

 const foocolumn = [
    {label: 'Opportunity name', fieldName: 'opportunityName', type: 'text'},
    {label: 'Confidence', fieldName: 'confidence', type: 'percent', cellAttributes:
    { iconName: { fieldName: 'trendIcon' }, iconPosition: 'right' }},
    {label: 'Amount', fieldName: 'amount', type: 'currency', typeAttributes: { currencyCode: 'EUR'}},
    {label: 'Contact Email', fieldName: 'contact', type: 'email'},
    {label: 'Contact Phone', fieldName: 'phone', type: 'phone'},
]; 


const data = [{
    id: 'a',
    opportunityName: 'Cloudhub',
    confidence: 0.2,
    amount: 25000,
    contact: 'jrogers@cloudhub.com',
    phone: '2352235235',
    trendIcon: 'utility:down'
},
{
    id: 'b',
    opportunityName: 'Quip',
    confidence: 0.78,
    amount: 740000,
    contact: 'quipy@quip.com',
    phone: '2352235235',
    trendIcon: 'utility:up'
}];

export default class ItemsToApproveTable extends LightningElement {

    @api workItemData;
    @api myData = 'foo';
    @api columns = foocolumn;

    //@track _columns;

    get columns(){
        console.log('strings:');
        console.log('foocolumn is: ' +  JSON.stringify(foocolumn));
        const myobj = this.createColumn('foo');
        console.log('foocolumn is: ' +  foocolumn);
        
        return this.createColumn('foo');
    }

    set columns(value) {
        this._columns = this.createColumn(this.workItemData);
        console.log ('in columns setter');
        
    }  
    
     connectedCallback () {
       var columnData;
       console.log('entering ItemstoApprove LWC');
       //columnData = this.generateColumnData(this.workItemData);
    }
    
    generateColumnData(workItemData) {
        var dataStructure = [];
        var inputData = JSON.parse(workItemData);
        console.log('entering generateColumnData');
        console.log('workItemData is: ' + workItemData);

        /* inputData.forEach(element => {
           
            
        }); */
       
        return 'foo';
    } 

    createColumn(field) {
        var columnDescriptor;
        //columnDescriptor='{"result":true, "count":42}';
        columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "Record Name", "type": "text"}';
        columnDescriptor = '[' + columnDescriptor + ']';  
        console.log('columnDescriptor: ' + columnDescriptor);
        const obj =  JSON.parse(columnDescriptor);
        return obj;
    }

   

}