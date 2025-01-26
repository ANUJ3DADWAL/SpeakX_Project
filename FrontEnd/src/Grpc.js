import { SearchRequest } from './proto/questions_pb';
import { QuestionServiceClient } from './proto/questions_grpc_web_pb';

const client = new QuestionServiceClient('http://localhost:8081', null, null);

export function searchQuestions(search, page = 1, pageSize = 10) {
    return new Promise((resolve, reject) => {
        const request = new SearchRequest();
        request.setQuery(search);
        request.setPage(page);
        request.setPagesize(pageSize);
        client.searchQuestions(request, {}, (err, response) => {
            if (err) {
                reject(err);
            } else {
                const questionsList = response.getQuestionsList();
                const questions = questionsList.map((question) => ({
                    id: question.getId(),
                    type: question.getType(),
                    title: question.getTitle(),
                    siblingId: question.getSiblingid(),
                }));
                const totalResults = response.getTotalresults();
                const totalPages = response.getTotalpages();
                resolve({ questions, totalResults, totalPages });
            }
        });
    });
}