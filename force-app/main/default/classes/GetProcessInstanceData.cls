public with sharing class GetProcessInstanceData {
    private static Map<String, Map<String, Schema.SObjectField>> OBJECT_NAME_TO_DESCRIBE;
    private static Map<String, String> OBJECT_NAME_TO_NAME_FIELD;
    private static Map<String, List<Schema.DescribeFieldResult>> REQUIRED_FIELDS_DESCRIBES;
    private static Set<String> FIELD_NAMES = new Set<String>{
            'Id'
    };

    @AuraEnabled
    public static String getProcessItemData(String actorId, String fieldNames, String objectName, String mode) {
        return JSON.serialize(getRowData(actorId, fieldNames, objectName, mode));
    }

    private static Set<Id> getRelatedActors(Id actorId) {
        Set<Id> actors = new Set<Id>{
                actorId
        };
        List<User> users = [SELECT Id,DelegatedApproverId FROM User WHERE DelegatedApproverId = :actorId];

        for (User curUser : users) {
            actors.add(curUser.Id);
        }

        List<GroupMember> relatedGroupMembers = [SELECT Id,GroupId FROM GroupMember WHERE UserOrGroupId = :actorId AND Group.Type = 'Queue'];
        if (!relatedGroupMembers.isEmpty()) {
            for (GroupMember curGm : relatedGroupMembers) {
                actors.add(curGm.GroupId);
            }
        }
        System.debug('actors:::' + actors);
        return actors;
    }

    public static Map<String, SObject> getSObjectMap(List<SObject> sObjects, String keyFieldName) {
        Map<String, SObject> results = new Map<String, SObject>();
        for (SObject so : sObjects) {
            results.put((String) so.get(keyFieldName), so);
        }
        return results;
    }

    public static Set<String> getSObjectSet(List<SObject> sObjects, String keyFieldName) {
        Set<String> results = new Set<String>();
        for (SObject so : sObjects) {
            results.add((String) so.get(keyFieldName));
        }
        return results;
    }

    public static void setFieldNames(String fieldNames, Set<String> objectTypes) {

        for (String objectType : objectTypes) {
            String nameField = OBJECT_NAME_TO_NAME_FIELD.get(objectType);
            if (nameField != null) {
                if (fieldNames == null || !fieldNames.toLowerCase().contains(nameField.toLowerCase())) {
                    FIELD_NAMES.add(nameField);
                }
            }
        }

        if (fieldNames != null) {
            FIELD_NAMES.addAll(fieldNames.replaceAll('\\s+', '').split(','));
            System.debug('FIELD_NAMES:::' + FIELD_NAMES);
        }
    }

    public static Map<String, SObject> getRecordData(Set<String> targetObjectIds, Set<String> objectTypes, String objectTypeName) {
        Map<String, SObject> allRecords = new Map<String, SObject>();
        for (String curObjectType : objectTypes) {
            if (objectTypeName == null || objectTypeName == curObjectType) {
                String myQuery = 'SELECT ' + getObjectAvailableFieldsString(curObjectType) + ' FROM ' + curObjectType + ' WHERE Id IN :targetObjectIds';
                System.debug('myQuery:::' + myQuery);
                allRecords.putAll(new Map<String, SObject>(Database.query(myQuery)));
            }
        }
        return allRecords;
    }

    private static String getObjectAvailableFieldsString(String objectName) {
        Set<String> availableFieldsSet = new Set<String>();

        Map<String, Schema.SObjectField> curObjectFieldDescribes = OBJECT_NAME_TO_DESCRIBE.get(objectName);
        for (String curField : FIELD_NAMES) {
            if (curObjectFieldDescribes.containsKey(curField)) {
                availableFieldsSet.add(curField);
            }
        }

        return String.join(new List<String>(availableFieldsSet), ', ');
    }

    public static ProcessData getRowData(String actorId, String fieldNames, String objectTypeName, String mode) {
        List<ProcessInstanceData> results = new List<ProcessInstanceData>();
        Set<Id> actors = getRelatedActors(actorId);
        List<ProcessInstanceWorkitem> curWorkItems = [SELECT Id, ActorId, ProcessInstanceId, OriginalActorId, CreatedById FROM ProcessInstanceWorkitem WHERE ActorId IN :actors];
        Map<String, SObject> workItemsToProcessInstanceMap = getSObjectMap(curWorkItems, 'ProcessInstanceId');
        Map<Id, ProcessInstance> processInstanceMap = new Map<Id, ProcessInstance>([SELECT Id, ProcessDefinitionId, TargetObjectId, LastActorId, CreatedById, CreatedDate FROM ProcessInstance WHERE Id IN :workItemsToProcessInstanceMap.keySet()]);
        Set<String> targetObjectIds = getSObjectSet(processInstanceMap.values(), 'TargetObjectId');
        Set<String> processDefinitionIds = getSObjectSet(processInstanceMap.values(), 'ProcessDefinitionId');
        Set<String> createdByIds = getSObjectSet(processInstanceMap.values(), 'CreatedById');
        createdByIds.addAll(getSObjectSet(processInstanceMap.values(), 'LastActorId'));
        createdByIds.addAll(getSObjectSet(curWorkItems, 'CreatedById'));
        Map<Id, ProcessDefinition> processDefinitionMap = new Map<Id, ProcessDefinition>([SELECT Id, TableEnumOrId FROM ProcessDefinition WHERE Id IN:processDefinitionIds]);
        Set<String> objectTypes = getSObjectSet(processDefinitionMap.values(), 'TableEnumOrId');
        setObjectDescribes(objectTypes);
        setSObjectNameFields(objectTypes);
        setFieldNames(fieldNames, objectTypes);
        getRequiredFieldDescribes(objectTypes);
        Map<Id, User> userMap = new Map<Id, User>([SELECT Id,Name,Username FROM User WHERE Id IN:createdByIds]);
        Map<String, SObject> recordData = getRecordData(targetObjectIds, objectTypes, objectTypeName);

        if (recordData != null && !recordData.isEmpty()) {
            for (ProcessInstanceWorkitem curWorkItem : curWorkItems) {
                ProcessInstance curProcessInstance = processInstanceMap.get(curWorkItem.ProcessInstanceId);
                ProcessDefinition curProcessDefinition = processDefinitionMap.get(curProcessInstance.ProcessDefinitionId);
                User createdByUser = userMap.get(curProcessInstance.CreatedById);
                User lastActorUser = userMap.get(curWorkItem.CreatedById);
                SObject curSObject = recordData.get(curProcessInstance.TargetObjectId);

                if (curProcessInstance != null && curSObject != null) {
                    results.add(new ProcessInstanceData(curSObject, curWorkItem, curProcessInstance, curProcessDefinition, createdByUser, lastActorUser));
                }
            }
        }

        return (new ProcessData(results));
    }

    @AuraEnabled
    public static void process(String reassignActorId, String action, List<String> workItemIds, String comment) {

        Map<Id, ProcessInstanceWorkitem> pisMap = new Map<Id, ProcessInstanceWorkitem>([SELECT Id, ActorId FROM ProcessInstanceWorkitem WHERE Id IN :workItemIds]);
        List<ProcessInstanceWorkitem> pisToReassign = new List<ProcessInstanceWorkitem>();
        for (String curWorkItemId : workItemIds) {
            if (action == 'Reassign') {
                ProcessInstanceWorkitem pi = pisMap.get(curWorkItemId);
                pi.ActorId = reassignActorId;
                pisToReassign.add(pi);
            } else {
                Approval.ProcessWorkitemRequest pwr = new Approval.ProcessWorkitemRequest();
                if (!String.isBlank(comment)) {
                    pwr.setComments(comment);
                }
                //TODO: manage multistep approval processes, where we need to assign next approver manually
//                pwr.setNextApproverIds(new List<Id>{
//                        reassignActorId
//                });
                pwr.setWorkitemId(curWorkItemId);
                pwr.setAction(action);
                Approval.ProcessResult pr = Approval.process(pwr);
            }
        }
        if (!pisToReassign.isEmpty()) {
            update pisToReassign;
        }
    }

    private static void setObjectDescribes(Set<String> objectNames) {
        Map<String, Map<String, Schema.SObjectField>> result = new Map<String, Map<String, Schema.SObjectField>>();
        //loop is faster then Schema.describeSObjects(types) and Schema.getGlobalDescribe()
        for (String objectName : objectNames) {
            SObjectType r = ((SObject) (Type.forName('Schema.' + objectName).newInstance())).getSObjectType();
            result.put(objectName, r.getDescribe().fields.getMap());
        }
        OBJECT_NAME_TO_DESCRIBE = result;
    }

    //Fields to be examined as Name fields
    private static void setSObjectNameFields(Set<String> objectTypes) {
        Map<String, String> results = new Map<String, String>();
        List<String> fieldsToExamine = new List<String>{
                'Name', 'CaseNumber', 'Subject', 'Id'
        };
        for (String sObjectName : objectTypes) {
            if (OBJECT_NAME_TO_DESCRIBE.containsKey(sObjectName)) {
                for (String curField : fieldsToExamine) {
                    if (!results.containsKey(sObjectName) && OBJECT_NAME_TO_DESCRIBE.get(sObjectName).containsKey(curField)) {
                        results.put(sObjectName, curField);
                    }
                }
            }
        }
        OBJECT_NAME_TO_NAME_FIELD = results;
        System.debug('OBJECT_NAME_TO_NAME_FIELD:::' + OBJECT_NAME_TO_NAME_FIELD);
    }

    private static void getRequiredFieldDescribes(Set<String> objectTypes) {
        Map<String, List<Schema.DescribeFieldResult>> results = new Map<String, List<Schema.DescribeFieldResult>>();

        for (String sObjectName : objectTypes) {
            if (!results.containsKey(sObjectName)) {
                results.put(sObjectName, new List<Schema.DescribeFieldResult>());
            }
            if (OBJECT_NAME_TO_DESCRIBE.containsKey(sObjectName)) {
                Map<String, Schema.SObjectField> curObjectFieldDescribes = OBJECT_NAME_TO_DESCRIBE.get(sObjectName);
                for (String curField : FIELD_NAMES) {
                    if (curObjectFieldDescribes.containsKey(curField)) {
                        results.get(sObjectName).add(curObjectFieldDescribes.get(curField).getDescribe());
                    }
                }
            }
        }
        REQUIRED_FIELDS_DESCRIBES = results;
    }

    public class ProcessData {
        List<ProcessInstanceData> processInstanceData;
        Map<String, List<Schema.DescribeFieldResult>> fieldDescribes;
        public ProcessData(List<ProcessInstanceData> processInstanceData) {
            this.processInstanceData = processInstanceData;
            this.fieldDescribes = REQUIRED_FIELDS_DESCRIBES;
        }
    }

    public class ProcessInstanceData {
        SObject sObj;
        ProcessInstanceWorkitem workItem;
        ProcessInstance processInstance;
        ProcessDefinition processDefinition;
        User createdByUser;
        User lastActorUser;
        String nameField;

        public ProcessInstanceData(SObject sObj, ProcessInstanceWorkitem workItem, ProcessInstance processInstance, ProcessDefinition processDefinition, User createdByUser, User lastActorUser) {
            this.sObj = sObj;
            this.workItem = workItem;
            this.processInstance = processInstance;
            this.processDefinition = processDefinition;
            this.createdByUser = createdByUser;
            this.lastActorUser = lastActorUser;
            this.nameField = OBJECT_NAME_TO_NAME_FIELD.get(processDefinition.TableEnumOrId);
        }
    }
}