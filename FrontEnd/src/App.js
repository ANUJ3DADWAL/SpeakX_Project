import React, { useState, useEffect, useCallback } from 'react';
import { searchQuestions } from './Grpc';


const QuestionsComponent = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [questions, setQuestions] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [cache, setCache] = useState({});

    const debounce = (func, delay) => {
        let debounceTimer;
        return function(...args) {
            const context = this;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    };

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setQuestions([]);
            setTotalResults(0);
            return;
        }

        if (cache[`${searchQuery}-${page}`]) {
            setQuestions(cache[`${searchQuery}-${page}`].questions);
            setTotalResults(cache[`${searchQuery}-${page}`].totalResults);
            setTotalPages(cache[`${searchQuery}-${page}`].totalPages);
            return;
        }

        setLoading(true);
        try {
            const { questions, totalResults, totalPages } = await searchQuestions(searchQuery, page, pageSize);
            setQuestions(questions);
            setTotalResults(totalResults);
            setTotalPages(totalPages);
            setCache((prevCache) => ({
                ...prevCache,
                [`${searchQuery}-${page}`]: { questions, totalResults, totalPages }
            }));
        } catch (error) {
            console.error('Error searching questions:', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page, pageSize, cache]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const debouncedHandleSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

    const handleQueryChange = (e) => {
        setSearchQuery(e.target.value);
        setPage(1);
        debouncedHandleSearch();
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        handleSearch();
    };

    const renderPageNumbers = () => {
        const maxPagesToShow = 5;
        const halfMaxPagesToShow = Math.floor(maxPagesToShow / 2);
        let startPage = Math.max(1, page - halfMaxPagesToShow);
        let endPage = Math.min(totalPages, page + halfMaxPagesToShow);

        if (page <= halfMaxPagesToShow) {
            endPage = Math.min(totalPages, maxPagesToShow);
        } else if (page + halfMaxPagesToShow >= totalPages) {
            startPage = Math.max(1, totalPages - maxPagesToShow + 1);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={i === page ? 'active' : ''}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="App">
            <h1 className="title">Speak X</h1>
            <p className="subtitle">Searching for data set <span>as per the problem statement</span></p>
            <div className="search-bar">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleQueryChange}
                    placeholder="Search questions..."
                    className="search-input"
                />
                <button onClick={handleSearch} className="search-button">Go</button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="results">
                    {questions.length > 0 ? (
                        questions.map((question, index) => (
                            <div key={question.id} className="result-item">
                                <div className="content">
                                    <h3>{question.title}</h3>
                                    <p className="author">Type: {question.type}</p>
                                    <p className="author">ID: {question.id}</p>
                                </div>
                                <div className="votes">
                                    <span className="vote-count">{index + 1}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No results found</p>
                    )}
                </div>
            )}
            <div className="pagination">
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                >
                    Previous
                </button>
                {renderPageNumbers()}
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default QuestionsComponent;