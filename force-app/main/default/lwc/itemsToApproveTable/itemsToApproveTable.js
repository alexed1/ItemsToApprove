/* eslint-disable no-console */
import { LightningElement, api,track} from 'lwc';
import process from '@salesforce/apex/GetProcessInstanceData.process';
import getProcessItemData from '@salesforce/apex/GetProcessInstanceData.getProcessItemData';

const actions = [
    { label: 'Approve', name: 'Approve' },
    { label: 'Reject', name: 'Reject' },
    { label: 'Reassign', name: 'Reassign' }
];


export default class ItemsToApproveTable extends LightningElement {

    @api rowData;
    @api columns;
    @api actorId;
    @api contextObjectType;
    @api fieldNames; //field names provided by called to be rendered as columns
    errorApex;
    errorJavascript;
    fieldDescribes; //not being used
    datatableColumnFieldDescriptorString
    selectedRows;
    apCount;
    commentVal = '';
    reassignActorId;
    actionReassign = false;

    settings = {
        reactionApprove: {label: 'Approve', variant: 'brand', value: 'Approve'},
        reactionReject: {label: 'Reject', variant: 'brand', value: 'Reject'},
        stringDataType: 'String',
        referenceDataType: 'reference',
    };
    
    get mode() {
        console.log('getting mode');
        if (this.contextObjectType && this.fieldNames)
            return 'single'; //display items to approve for a single type of object, enabling additional fields to be displayed
        else if ((this.contextObjectType && !this.fieldNames) || (!this.contextObjectType && this.fieldNames)) {
            console.log('made it to the error throw');
            this.errorJavascript = 'Flow Configuration error: You have either specified a contextObjectType without specifying the additional fields you want displayed, or you have specified fields without providing the name of an object type.';
            }
             else return 'mixed';
        }

    connectedCallback () {   
       console.log('entering itemstoapprove');   
       this.getServerData();
    }
   
    //call apex and get back an object containing both row and column information
    //column information is only fetched when Mode is Single, which means that the table will be limited to a single record and can therefore show columns of fields from that record (passed in as fieldNames)
    //row data is a mix of metadata from the approval process, the submitter, and the context record
    getServerData() { 
        getProcessItemData({ actorId: this.actorId, objectName: this.contextObjectType, fieldNames : this.fieldNames, mode : this.mode})
        .then(result => {
            //console.log('getProcessItemData returns: ' + result);
            let processInstanceData = JSON.parse(result);
            this.datatableColumnFieldDescriptorString = processInstanceData.datatableColumnFieldDescriptorString;
            this.createColumns();
            this.rowData = this.generateRowData(processInstanceData.rowData);
            })
            .catch(error => {
                console.log('error is: ' + JSON.stringify(error));
                this.errorApex = 'Apex Action error: ' + error.body.message;
                return this.errorApex;  
            });
    }


    createColumns() {
        var fullColumns = '';
        if (this.mode.toLowerCase() === 'single') {
            fullColumns = this.createCustomColumns() + this.datatableColumnFieldDescriptorString +  this.addRowActionMenu() + ']';
            console.log('columns set to ' + fullColumns);
            this.columns = JSON.parse(fullColumns);
        } else if (this.mode.toLowerCase() === 'mixed')  {
                fullColumns = this.createStandardColumns();
                console.log('columns set to ' + fullColumns);
                this.columns = JSON.parse(fullColumns);
        } else  {
            console.log('in error case');
            //this doesn't work:
            throw new Error('Unsupported value provided for Mode. Use Mixed or Single');
        }    
    }

    updateSelectedRows(event) {
        console.log('some rows were selected in the wrapper itemsToApproveTable');
        console.log(JSON.stringify(event.detail.selectedRows));
        this.selectedRows = event.detail.selectedRows;
        this.apCount = event.detail.selectedRows.length;
       
    }

    //receive event from child datatable
    handleRowAction(event){
        console.log('entering handleRowAction in itemsToApproveTable.js');
        const action = event.detail.action;
        let row = event.detail.row;
        if(action == 'Approve' || action == 'Reject') {
            this.processApprovalAction(action.name,row);
        } else {
            //reassignment
            this.actionReassign = true;
            this.modalAction(true);
        }
        
    }

    handleModalBatch(action){
        console.log('entering handleModalBatch action is: ' + action);
        this.selectedRows.forEach(row => {
           this.processApprovalAction(action,row);      //this should be batched up for more efficiency
        });
    }

    processApprovalAction(action, row){
        const workItemIds = [];
        console.log('entering processApprovalAction: ' + JSON.stringify(row));
        workItemIds.push(row.WorkItemId);
        console.log('commentval is: ' + this.commentVal);
        process({ actorId: this.reassignActorId, action : action, workItemIds : workItemIds, comment : this.commentVal})
            .then(result => {
                console.log('result from process call is: ' + result);
                this.showToast('Approval Management', action + ' Complete', 'success', true);
                this.getServerData();
            })
            .catch(error => {
                console.log('error returning from process work item apex call is: ' + JSON.stringify(error));  
            });  
    }

    showToast(title, message, variant, autoClose) {
        this.template.querySelector('c-toast-message').showCustomNotice({
            detail: {
                title: title, message: message, variant: variant, autoClose: autoClose
            }
        });
    }

    createStandardColumns() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        columnDescriptor = columnDescriptor + this.addRowActionMenu();
        columnDescriptor = '[' + columnDescriptor + ']';
        console.log('total standard columnDescriptor is:  ' + columnDescriptor);
        return columnDescriptor;
    }

    addRowActionMenu() {
        return  ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}';
    }

    createCustomColumns() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        columnDescriptor = '[' + columnDescriptor ;
        return columnDescriptor;
        //given an object and a field name, find the type and label and return a valid string structure
    }

    generateRowData(rowData) {
        var outputData = '';
        var inputData = JSON.parse(rowData);
        //console.log('input data is: ' + rowData);
        inputData.forEach(element => {
           
            outputData = outputData + '{"Submitter" : "' + element.createdByName +'", "WorkItemId" : "' + element.workItemId + '", "ActorId" : "' + element.actorId + '", "TargetObjectId" : "' +  element.targetObjectId + '", "Type" : "' + element.contextRecordObjectType + '", "RecordName" : "' + element.contextRecordName + '", "RecordURL" : "' + element.contextRecordURL + '",'; 
            //values for custom fields have been retrned in the rowdata and here are put into the format expected by datatable
            this.fieldNames.split(',').forEach(fieldName => {
                outputData = outputData + ' "' + fieldName + '" : "' + element[fieldName] + '",';
            })            
            
            outputData = outputData.slice(0,-1) + '},';
        
        });
        outputData = '[' +  outputData.slice(0,-1) + ']';
        console.log('outputData is: ' + outputData);
        return JSON.parse(outputData);
    }

    get modalReactions() {
        return [this.settings.reactionApprove, this.settings.reactionReject];
    }

    handleModalReactionButtonClick(event) {
        console.log('modal reaction received with value: ' + event.detail.value);
        /* if (event.detail.value === this.settings.reactionApprove.value) {
            this.dispatchValueChangedEvent('approve');
        } else {
            if (event.detail.value === this.settings.reactionReject.value) {
                this.dispatchValueChangedEvent('reject');
            } else console.log('something is wrong');
        } */
        this.handleModalBatch(event.detail.value);
    }

    handleButtonClick(event) {
        console.log('buttonclicked');
        this.modalAction(true);
    }
    handleComment(event){
        console.log('comment made');
        this.commentVal = event.detail.value;
    }

    modalAction(isOpen) {
        const existing = this.template.querySelector('c-uc-modal');
        
        if (existing) {
            if (isOpen) {
                console.log('opening modal');
                //get the selected values
                //let selectedVals = 
                existing.openModal(this.selectedRows);
            } else {
                existing.closeModal();
            }
        }
    }

    dispatchValueChangedEvent(value) {
        let returnedValue = value;
        let valueType = this.settings.stringDataType;
        if (!returnedValue) {
            returnedValue = this.singleSelect ? (this.existingMembers.length ? this.existingMembers[0] : null) : this.existingMembers;
            valueType = this.settings.referenceDataType;
        }

        const valueChangedEvent = new CustomEvent('valuechanged', {
            detail: {
                id: this.name,
                newValue: returnedValue,
                newValueType: valueType,
                newValueObjectType: this.selectedType
            }
        });
        this.dispatchEvent(valueChangedEvent);
    }


}