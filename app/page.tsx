"use client"

import React, { useState, useEffect } from 'react';

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: number;
    question: string;
    options: string[];
    answer: string;
    type: string;
}

interface QuestionWithFormattedOptions extends Omit<Question, 'options'> {
    options: Option[];
    type: 'single' | 'multiple';
}

interface QuestionData {
    questions: Question[];
    totalScore: number;
}

interface ApiResponse {
    success: boolean;
    data: {
        singleChoice: QuestionData;
        multipleChoice: QuestionData;
    };
}

interface QuizState {
    selectedOptions: { [key: string]: string[] };
    currentQuestionIndex: number;
    remainingTime: number;
    score: number;
    wrongQuestions: (QuestionWithFormattedOptions & { userAnswer: string[] })[];
    showAnswer: boolean;
    singleCount: number;
    multipleCount: number;
    questions: QuestionWithFormattedOptions[];
}

const App: React.FC = () => {
    const [quizState, setQuizState] = useState<QuizState>({
      selectedOptions: {},
      currentQuestionIndex: 0,
      remainingTime: 45 * 60,
      score: 0,
      wrongQuestions: [],
      showAnswer: false,
      singleCount: 20,
      multipleCount: 20,
        questions: []
    });
    const [showResult, setShowResult] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showWrongQuestions, setShowWrongQuestions] = useState(false);
    const [showResumeConfirmation, setShowResumeConfirmation] = useState(false);

    const QUIZ_STORAGE_KEY = 'quiz_state';
    const WRONG_QUESTIONS_STORAGE_KEY = 'wrong_questions';


    const loadQuizStateFromStorage = (): QuizState | null => {
        try {
            const storedState = localStorage.getItem(QUIZ_STORAGE_KEY);
            if (storedState) {
                return JSON.parse(storedState) as QuizState;
            }
            return null;
        } catch (error) {
            console.error("Failed to load quiz state from localStorage", error);
            return null;
        }
    };

    const saveQuizStateToStorage = (state: QuizState) => {
        try{
           localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
          }
          catch(error){
            console.error('Failed to save quiz state to localStorage', error);
          }
    };

    const clearQuizState = () => {
        localStorage.removeItem(QUIZ_STORAGE_KEY);
    }

    const loadStoredWrongQuestions = () => {
        try {
            const storedWrongQuestions = localStorage.getItem(WRONG_QUESTIONS_STORAGE_KEY);
            if (storedWrongQuestions) {
                return JSON.parse(storedWrongQuestions) as (QuestionWithFormattedOptions & { userAnswer: string[] })[];
            }
            return [];
        } catch (error) {
            console.error("Failed to load wrong questions from localStorage", error);
            return [];
        }
    };

    const saveWrongQuestions = (questions: (QuestionWithFormattedOptions & { userAnswer: string[] })[]) => {
        try {
            localStorage.setItem(WRONG_QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
        } catch (error) {
            console.error("Failed to save wrong questions to localStorage", error);
        }
    };


    const handleStartQuiz = async () => {
      setIsConfigured(true);
      fetchQuestions();
  }
    const handleResumeQuiz = async () => {
        const storedState = loadQuizStateFromStorage();
        if (storedState) {
          setQuizState(storedState)
          setIsConfigured(true);
          setIsInitialLoad(false);
          setShowResumeConfirmation(false);
        }
      };

const handleNewQuiz = () => {
    setShowResumeConfirmation(false);
    setIsConfigured(false);
    setIsInitialLoad(false);
    clearQuizState();
  
  setQuizState({
    selectedOptions: {},
    currentQuestionIndex: 0,
    remainingTime: 45 * 60,
    score: 0,
    wrongQuestions: [],
    showAnswer: false,
    singleCount: 20,
    multipleCount: 20,
      questions: []
  })
  
  };

  const fetchQuestions = async () => {
    try {
        const response = await fetch(`/api/questions?singleCount=${quizState.singleCount}&multipleCount=${quizState.multipleCount}`);
        const data: ApiResponse = await response.json();
        if (data.success) {
            const formatQuestions = (questions: Question[], type: 'single' | 'multiple'): QuestionWithFormattedOptions[] => {
                return questions.map(q => ({
                    ...q,
                    type,
                    options: q.options.map((opt, index) => ({
                        id: String.fromCharCode(65 + index),
                        text: opt
                    }))
                }));
            };

            const allQuestions = [
                ...formatQuestions(data.data.singleChoice.questions, 'single'),
                ...formatQuestions(data.data.multipleChoice.questions, 'multiple')
            ];
            setQuizState(prevState => ({ ...prevState, questions: allQuestions }));
        }
    } catch (error) {
        console.error('获取题目失败:', error);
    }
};

  useEffect(() => {
    if (isInitialLoad) {
      const storedState = loadQuizStateFromStorage();
      if (storedState) {
        setShowResumeConfirmation(true);
      } else {
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

    useEffect(() => {
        if (isConfigured && quizState.questions.length > 0) {
            const timer = setInterval(() => {
                setQuizState(prev => {
                    if (prev.remainingTime <= 0) {
                        clearInterval(timer);
                        handleSubmit();
                        return { ...prev, remainingTime: 0 };
                    }
                    return { ...prev, remainingTime: prev.remainingTime - 1 };
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isConfigured, quizState.questions]);


    useEffect(() =>{
        if(isConfigured){
          saveQuizStateToStorage(quizState)
        }
    }, [quizState, isConfigured])

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

     // 修改 handleOptionSelect 函数，使用 question.type 和 question.id 作为键
    const handleOptionSelect = (question: QuestionWithFormattedOptions, optionId: string) => {
      const questionKey = `${question.type}-${question.id}`;
  
      setQuizState(prev => {
          if (question.type === 'single') {
              return { ...prev, selectedOptions: { ...prev.selectedOptions, [questionKey]: [optionId] } };
          } else {
              const currentSelected = prev.selectedOptions[questionKey] || [];
              const newSelected = currentSelected.includes(optionId)
                  ? currentSelected.filter(id => id !== optionId)
                  : [...currentSelected, optionId];
              return { ...prev, selectedOptions: { ...prev.selectedOptions, [questionKey]: newSelected } };
          }
      });
  };

    // 修改 isOptionSelected 函数，使用 question.type 和 question.id 作为键
    const isOptionSelected = (question: QuestionWithFormattedOptions, optionId: string) => {
        const questionKey = `${question.type}-${question.id}`;
        const selectedForQuestion = quizState.selectedOptions[questionKey] || [];
        return selectedForQuestion.includes(optionId);
    };
    

    const handlePrevQuestion = () => {
        if (quizState.currentQuestionIndex > 0) {
          setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1, showAnswer: false }));
        }
    };

    const handleNextQuestion = () => {
        if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
          setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1, showAnswer: false }));
        }
    };

    const handleSubmit = () => {
        let correctCount = 0;
        const wrongList: (QuestionWithFormattedOptions & { userAnswer: string[] })[] = [];

        quizState.questions.forEach((question) => {
            const questionKey = `${question.type}-${question.id}`;
            const userAnswer = quizState.selectedOptions[questionKey] || [];
            const isCorrect = arraysEqual(userAnswer, question.answer);

            if (isCorrect) {
                correctCount++;
            } else {
                wrongList.push({
                    ...question,
                    userAnswer,
                });
            }
        });

        const totalScore = Math.round((correctCount / quizState.questions.length) * 100);
        setQuizState(prev => ({ ...prev, score: totalScore, wrongQuestions: wrongList }));
        saveWrongQuestions(wrongList);
        setShowResult(true);
        clearQuizState();
    };

    const arraysEqual = (userAnswer: string[], correctAnswer: string) => {
        const correctAnswerArray = correctAnswer.replace(/\s+/g, '').split('');
        return (
            userAnswer.sort().join('') === correctAnswerArray.sort().join('')
        );
    };

    const getCorrectAnswerText = (question: QuestionWithFormattedOptions) => {
        const correctAnswers = question.answer.replace(/\s+/g, '').split('');
        return question.options
            .filter(opt => correctAnswers.includes(opt.id))
            .map(opt => opt.text)
            .join('\n');
    };

   const handleRestartQuiz = () => {
       setShowResult(false);
       setIsConfigured(false)
       setQuizState(prev => ({
         ...prev,
         currentQuestionIndex: 0,
         remainingTime: 45 * 60,
         score: 0,
         wrongQuestions: [],
       }));
        clearQuizState();
         setIsInitialLoad(true);
    }
    const handleShowWrongQuestions = () => {
        setShowWrongQuestions(true);
    }
    if (showResumeConfirmation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded shadow-md">
                    <h2 className="text-2xl font-bold mb-6">是否恢复上次考试?</h2>
                    <p className="text-gray-700 mb-6">
                       检测到您有未完成的考试, 您想从上次中断的地方继续吗？
                    </p>
                    <div className="flex justify-between">
                        <button
                            onClick={handleNewQuiz}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          开始新考试
                        </button>
                        <button
                            onClick={handleResumeQuiz}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            恢复考试
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    if (showWrongQuestions) {
       const storedWrongQuestions = loadStoredWrongQuestions();
         return (
            <div className="min-h-screen bg-gray-50 p-8">
                <h2 className="text-2xl font-bold mb-8">错题记录</h2>
                 {storedWrongQuestions.length === 0 ? (
                        <div className="bg-white p-6 rounded-lg shadow text-center">
                          <p className="text-gray-500">暂无错题记录。</p>
                           <button
                                onClick={()=>setShowWrongQuestions(false)}
                                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                           >返回
                           </button>
                        </div>

                    ) : (
                       <div className="bg-white p-6 rounded-lg shadow">
                            <div className="space-y-4">
                                {storedWrongQuestions.map((question) => (
                                    <div key={`${question.type}-${question.id}`} className="border p-4 rounded-lg">
                                        <p className="font-medium">{question.question}</p>
                                        <p className="text-red-500">
                                            你的答案：{(question.userAnswer || []).map(id =>
                                                question.options.find(opt => opt.id === id)?.text || id
                                            ).join('，') || '未作答'}
                                        </p>
                                        <p className="text-green-500">
                                            正确答案：{getCorrectAnswerText(question)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                          <div className="mt-6 flex justify-center">
                              <button
                                  onClick={()=>setShowWrongQuestions(false)}
                                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                              >返回
                              </button>
                          </div>
                        </div>
                     )}

             </div>
         )
    }

    if (!isConfigured) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded shadow-md">
                    <h2 className="text-2xl font-bold mb-6">配置题目数量</h2>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            单选题数量:
                        </label>
                        <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={quizState.singleCount}
                            onChange={(e) => setQuizState(prev => ({ ...prev, singleCount: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                           多选题数量:
                        </label>
                        <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={quizState.multipleCount}
                            onChange={(e) => setQuizState(prev => ({ ...prev, multipleCount: Number(e.target.value) }))}
                        />
                    </div>
                     <div className="flex justify-between items-center">
                         <button
                           onClick={handleShowWrongQuestions}
                             className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                         >查看错题
                         </button>
                         <button
                            onClick={handleStartQuiz}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                          >开始
                        </button>
                     </div>


                </div>
            </div>
        );
    }

    if (showResult) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <h2 className="text-2xl font-bold mb-8">考试结果</h2>
                <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-lg mb-4">你的得分：<span className="font-bold">{quizState.score}分</span></p>
                    <div className="space-y-4">
                        {quizState.wrongQuestions.map((question) => (
                            <div key={`${question.type}-${question.id}`} className="border p-4 rounded-lg">
                                <p className="font-medium">{question.question}</p>
                                <p className="text-red-500">
                                    你的答案：{(question.userAnswer || []).map(id =>
                                        question.options.find(opt => opt.id === id)?.text || id
                                    ).join('，') || '未作答'}
                                </p>
                                <p className="text-green-500">
                                    正确答案：{getCorrectAnswerText(question)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
              <div className="mt-6 flex justify-center">
                  <button
                      onClick={handleRestartQuiz}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                      重新开始
                  </button>
              </div>
            </div>
        );
    }

    if (quizState.questions.length === 0) {
        return <div className="min-h-screen flex items-center justify-center">加载题目中...</div>;
    }

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

    return (
        <div className="relative min-h-screen bg-gray-50">
            <div className="fixed top-0 w-full bg-white shadow-sm z-50">
                <div className="flex items-center justify-between px-4 h-14">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-blue-600">DHUer专用</span>
                        <span className="text-gray-600">{quizState.currentQuestionIndex + 1}/{quizState.questions.length}</span>
                    </div>
                    <div className="text-gray-600">
                        <i className="fas fa-clock mr-2"></i>
                        {formatTime(quizState.remainingTime)}
                    </div>
                </div>
            </div>

            <div className="pt-20 pb-24 px-4">
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        {quizState.currentQuestionIndex + 1}. {currentQuestion.question}
                        <span className="ml-2 text-sm text-gray-500">
              ({currentQuestion.type === 'single' ? '单选题' : '多选题'})
            </span>
                    </h2>
                </div>

                <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                        <button
                            key={`${currentQuestion.type}-${currentQuestion.id}-${option.id}`}
                            className={`w-full p-4 rounded-lg border transition-all duration-200 ${isOptionSelected(currentQuestion, option.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-blue-200'
                            }`}
                            onClick={() => handleOptionSelect(currentQuestion, option.id)}
                        >
                            <div className="flex items-start">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${isOptionSelected(currentQuestion, option.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {option.id}
                </span>
                                <span className="ml-3 text-left text-gray-700">{option.text}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {quizState.showAnswer && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                        <p className="text-green-600 font-medium">正确答案：</p>
                        <p className="text-green-600">{getCorrectAnswerText(currentQuestion)}</p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={handlePrevQuestion}
                        className={`px-6 py-2 rounded-lg ${quizState.currentQuestionIndex === 0
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-white border border-blue-500 text-blue-500'
                        }`}
                        disabled={quizState.currentQuestionIndex === 0}
                    >
                        上一题
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setQuizState(prev => ({ ...prev, showAnswer: !prev.showAnswer }))}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            {quizState.showAnswer ? '隐藏答案' : '查看答案'}
                        </button>
                        <button
                            onClick={quizState.currentQuestionIndex === quizState.questions.length - 1 ? handleSubmit : handleNextQuestion}
                            className={`px-6 py-2 rounded-lg ${quizState.currentQuestionIndex === quizState.questions.length - 1
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}
                        >
                            {quizState.currentQuestionIndex === quizState.questions.length - 1 ? '提交' : '下一题'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;