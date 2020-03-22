/* eslint-disable no-console */
import {LightningElement, api, track} from 'lwc';
import process from '@salesforce/apex/GetProcessInstanceData.process';
import getProcessItemData from '@salesforce/apex/GetProcessInstanceData.getProcessItemData';

export default class ItemsToApproveTable extends LightningElement {

    @api actorId;
    @api contextObjectType;
    @api fieldNames; //field names provided by called to be rendered as columns
    @api disableReassignment;
    rowData;
    columns;
    fieldDescribes;
    settings = {
        reactionOk: {label: 'Ok', variant: 'brand', value: 'Ok'},
        actionApprove: 'Approve',
        actionReject: 'Reject',
        actionReassign: 'Reassign',
        stringDataType: 'String',
        referenceDataType: 'reference',
        singleMode: 'single',
        mixedMode: 'mixed',
        fieldNameSubmitter: '__Submitter',
        fieldNameSubmitterURL: '__SubmitterURL',
        fieldNameLastActor: '__LastActor',
        fieldNameLastActorURL: '__LastActorURL',
        fieldNameType: '__Type',
        fieldNameRecordName: '__Name',
        fieldNameRecordURL: '__RecordURL',
        fieldNameRecentApproverURL: '__RecentApproverUrl',
        defaultDateAttributes: {weekday: "long", year: "numeric", month: "long", day: "2-digit"},
        defaultDateTimeAttributes: {year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit"}
    };

    mandatoryColumnDescriptors = [
        {
            label: "Record Name",
            fieldName: this.settings.fieldNameRecordURL,
            type: "url",
            typeAttributes: {label: {fieldName: this.settings.fieldNameRecordName}, target: "_blank"}
        },
        {label: "Type", fieldName: this.settings.fieldNameType, type: "text"},
        {
            label: "Date Submitted",
            fieldName: 'dateSubmitted',
            type: "date",
            typeAttributes: this.settings.defaultDateTimeAttributes
        },
        {
            label: "Submitter",
            fieldName: this.settings.fieldNameSubmitterURL,
            type: "url",
            typeAttributes: {label: {fieldName: this.settings.fieldNameSubmitter}, target: "_blank"}
        } ,
        {
            label: "Recent Approver",
            fieldName: this.settings.fieldNameLastActorURL,
            type: "url",
            typeAttributes: {label: {fieldName: this.settings.fieldNameLastActor}, target: "_blank"}
        } 
    ];

    apActions = [
        {label: this.settings.actionApprove, value: this.settings.actionApprove, name: this.settings.actionApprove},
        {label: this.settings.actionReject, value: this.settings.actionReject, name: this.settings.actionReject},
        {label: this.settings.actionReassign, value: this.settings.actionReassign, name: this.settings.actionReassign}
    ];
    currentAction = this.settings.actionApprove;
    errorApex;
    errorJavascript;
    selectedRows;
    apCount;
    commentVal = '';
    reassignActorId;

    connectedCallback() {
        this.getServerData();
    }

    getServerData() {
        getProcessItemData({
            actorId: this.actorId,
            objectName: this.contextObjectType,
            fieldNames: this.fieldNames,
            mode: this.mode
        }).then(result => {
            let processData = JSON.parse(result);
            this.fieldDescribes = processData.fieldDescribes;
            this.createColumns();
            this.rowData = this.generateRowData(processData.processInstanceData);
        }).catch(error => {
            console.log('error is: ' + JSON.stringify(error));
        });
    }

    createColumns() {
        this.columns = [...this.mandatoryColumnDescriptors.filter(curDescriptor => {
            return this.mode !== this.settings.singleMode || !(this.mode === this.settings.singleMode && curDescriptor.fieldName === this.settings.fieldNameType)
        }), ...this.getCustomFieldColumns(), this.getActionMenuItems()];
    }

    getCustomFieldColumns() {
        let resultFields = [];
        if (this.fieldNames) {
            this.fieldNames.replace(/\s+/g, '').split(',').forEach(curFieldName => {
                let fieldDescribe = this.getFieldDescribe(this.contextObjectType, curFieldName);
                if (fieldDescribe) {
                    resultFields.push({
                            ...{
                                label: fieldDescribe.label,
                                fieldName: curFieldName
                            }, ...this.getDefaultTypeAttributes(fieldDescribe.type)
                        }
                    );
                }
            });
        }
        return resultFields;
    }

    getDefaultTypeAttributes(type) {
        if (type.includes('date')) {
            return {
                type: "date",
                typeAttributes: this.settings.defaultDateTimeAttributes
            };
        } else {
            return {type: 'text'};
        }
    }

    getFieldDescribe(objectName, fieldName) {
        if (this.fieldDescribes && this.fieldDescribes[objectName]) {
            let fieldDescribe = this.fieldDescribes[objectName].find(curFieldDescribe => curFieldDescribe.name.toLowerCase() === fieldName.toLowerCase());
            return fieldDescribe;
        }
    }

    get actionReassign() {
        return this.currentAction === this.settings.actionReassign;
    }

    get allowedActions() {
        if (this.apActions && this.apActions.length) {
            if (this.disableReassignment) {
                return this.apActions.filter(curAction => curAction.value != this.settings.actionReassign);
            } else {
                return this.apActions;
            }
        }
        return [];
    }

    get mode() {
        if (this.contextObjectType && this.fieldNames)
            return this.settings.singleMode; //display items to approve for a single type of object, enabling additional fields to be displayed
        else if (!this.contextObjectType && this.fieldNames) {
            this.errorJavascript = 'Flow Configuration error: You have specified fields without providing the name of an object type.';
        } else {
            return this.settings.mixedMode;
        }
    }

    updateSelectedRows(event) {
        this.selectedRows = event.detail.selectedRows;
        this.apCount = event.detail.selectedRows.length;
    }

    handleRowAction(event) {
        this.currentAction = event.detail.action.value;
        if (this.currentAction === this.settings.actionApprove || this.currentAction === this.settings.actionReject) {
            this.processApprovalAction(event.detail.row);
        } else {
            this.modalAction(true);
        }
    }

    handleModalBatch() {
        this.processApprovalAction();
    }

    processApprovalAction(curRow) {
        if ((curRow || (this.selectedRows && this.selectedRows.length)) && this.currentAction) {
            process({
                reassignActorId: this.reassignActorId,
                action: this.currentAction,
                workItemIds: curRow ? [curRow.WorkItemId] : this.selectedRows.map(curRow => curRow.WorkItemId),
                comment: this.commentVal
            })
                .then(result => {
                    this.showToast('Approval Management', this.currentAction + ' Complete', 'success', true);
                    this.getServerData();
                })
                .catch(error => {
                    console.log('error returning from process work item apex call is: ' + JSON.stringify(error));
                });
        }
    }

    showToast(title, message, variant, autoClose) {
        this.template.querySelector('c-toast-message').showCustomNotice({
            detail: {
                title: title, message: message, variant: variant, autoClose: autoClose
            }
        });
    }

    getActionMenuItems() {
        return {
            type: "action",
            typeAttributes: {rowActions: this.allowedActions, menuAlignment: "left"}
        };
    }

    getRecordURL(sObject) {
        return '/lightning/r/' + sObject.attributes.type + '/' + sObject.Id + '/view';
    }

    getObjectUrl(objectTypeName, recordId) {
        return '/lightning/r/' + objectTypeName + '/' + recordId + '/view';
    }

    generateRowData(rowData) {
        return rowData.map(curRow => {
            let resultData = {
                ...{
                    WorkItemId: curRow.workItem.Id,
                    ActorId: curRow.workItem.ActorId,
                    TargetObjectId: curRow.sObj.Id,
                    dateSubmitted: curRow.processInstance.CreatedDate
                }, ...curRow.sObj
            };
            resultData[this.settings.fieldNameSubmitter] = curRow.createdByUser.Name;
            resultData[this.settings.fieldNameSubmitterURL] = this.getObjectUrl('User', curRow.createdByUser.Id);
            if (curRow.lastActorUser) {
                resultData[this.settings.fieldNameLastActor] = curRow.lastActorUser.Name;
                resultData[this.settings.fieldNameLastActorURL] = this.getObjectUrl('User', curRow.lastActorUser.Id);
            }
            resultData[this.settings.fieldNameType] = curRow.sObj.attributes.type;
            resultData[this.settings.fieldNameRecordName] = curRow.sObj[curRow.nameField];
            resultData[this.settings.fieldNameRecordURL] = this.getRecordURL(curRow.sObj);
            return resultData;
        });
    }

    get modalReactions() {
        return [this.settings.reactionOk];
    }

    handleModalReactionButtonClick(event) {
        this.handleModalBatch();
    }

    handleButtonClick(event) {
        this.currentAction = this.settings.actionApprove;
        this.modalAction(true);
    }

    handleComment(event) {
        this.commentVal = event.detail.value;
    }

    modalAction(isOpen) {
        const existing = this.template.querySelector('c-uc-modal');

        if (existing) {
            if (isOpen) {
                existing.openModal(this.selectedRows);
            } else {
                existing.closeModal();
            }
        }
    }

    handleSelectionChange(event) {
        this.reassignActorId = event.detail.value;
    }

    handleActionChange(event) {
        this.currentAction = event.detail.value;
    }

    get isManageDisabled() {
        return (!this.selectedRows || this.selectedRows.length === 0);
    }
}