public with sharing class UserLookupController {

    private final static Integer MAX_RESULTS = 5;

    @AuraEnabled(Cacheable=true)
    public static List<LookupSearchResult> search(String searchTerm, List<String> userIdList) {
        List<LookupSearchResult> results = new List<LookupSearchResult>();

        List<List<SObject>> searchResults;
        searchTerm += '*';
        if(userIdList != null && !userIdList.isEmpty()) {
            searchResults = [FIND :searchTerm IN NAME FIELDS
                            RETURNING User (Id, Name, Email, FullPhotoUrl WHERE Id IN :userIdList)
                            LIMIT :MAX_RESULTS];
        } else {
            searchResults = [FIND :searchTerm IN NAME FIELDS
                            RETURNING User (Id, Name, Email, FullPhotoUrl)
                            LIMIT :MAX_RESULTS];
        }

        User [] users = ((List<User>) searchResults[0]);

        for (User curUser : users) {
            results.add(new LookupSearchResult(curUser.Id, 'User', curUser.FullPhotoUrl, curUser.Name, '• '+ curUser.Email));
        }

        return results;
    }
}
