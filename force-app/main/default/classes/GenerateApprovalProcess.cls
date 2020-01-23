public with sharing class GenerateApprovalProcess {
    
    public static void createApprovalProcess() {
        MetadataService.MetadataPort service = createService();		
		MetadataService.ApprovalProcess curProcess = new MetadataService.ApprovalProcess();
		curProcess.allowedSubmitters = new List<MetadataService.ApprovalSubmitter>();

        MetadataService.ApprovalSubmitter curSubmitter = new MetadataService.ApprovalSubmitter();
        curSubmitter.type_x = 'allInternalUsers';     
        curProcess.allowedSubmitters.add(curSubmitter);

        curProcess.active = false;
        curProcess.label = 'testProc1';
        curProcess.fullName = 'Account.TestApproval2'; //rnd * 1000 mod? trip?
        curProcess.allowRecall = false;
        curProcess.showApprovalHistory = true; 
        curProcess.recordEditability = 'AdminOrCurrentApprover';
        curProcess.finalApprovalRecordLock = false;
        curProcess.finalRejectionRecordLock = false;
        curProcess.showApprovalHistory = false;

        curProcess.approvalStep = new List<MetadataService.ApprovalStep>();

        MetadataService.ApprovalStep curStep = new MetadataService.ApprovalStep();
        curStep.name = 'step1';
        curStep.label = 'step1';

        MetadataService.ApprovalStepApprover curStepApproverSet = new MetadataService.ApprovalStepApprover();
        List<MetadataService.Approver> curApproverList= new List<MetadataService.Approver>();

        MetadataService.Approver curApprover = new MetadataService.Approver();
        curApprover.type_x = 'relatedUserField';
        curApprover.name = 'accountApprover__c';
        curApproverList.add(curApprover);

        curProcess.approvalStep.add(curStep);



		List<MetadataService.SaveResult> results = 		
			service.createMetadata(
				new MetadataService.Metadata[] { curProcess });		
		handleSaveResults(results[0]); 
    }

    public static void GenerateApprovalStep(String ProcessName) {



    }

    public class MetadataServiceExamplesException extends Exception { }

    public static MetadataService.MetadataPort createService()
    {
        MetadataService.MetadataPort service = new MetadataService.MetadataPort();
        service.SessionHeader = new MetadataService.SessionHeader_element();
        service.SessionHeader.sessionId = UserInfo.getSessionId();
        return service;
    }


    /**
     * Example helper method to interpret a SaveResult, throws an exception if errors are found
     **/
    public static void handleSaveResults(MetadataService.SaveResult saveResult)
    {
        // Nothing to see?
        if(saveResult==null || saveResult.success)
            return;
        // Construct error message and throw an exception
        if(saveResult.errors!=null)
        {
            List<String> messages = new List<String>();
            messages.add(
                (saveResult.errors.size()==1 ? 'Error ' : 'Errors ') +
                    'occured processing component ' + saveResult.fullName + '.');
            for(MetadataService.Error error : saveResult.errors)
                messages.add(
                    error.message + ' (' + error.statusCode + ').' +
                    ( error.fields!=null && error.fields.size()>0 ?
                        ' Fields ' + String.join(error.fields, ',') + '.' : '' ) );
            if(messages.size()>0)
                throw new MetadataServiceExamplesException(String.join(messages, ' '));
        }
        if(!saveResult.success)
            throw new MetadataServiceExamplesException('Request failed with no specified error.');
    }


}
