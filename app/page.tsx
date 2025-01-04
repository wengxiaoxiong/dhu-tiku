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

const App: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: string[] }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState(45 * 60);
  const [questions, setQuestions] = useState<QuestionWithFormattedOptions[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<(QuestionWithFormattedOptions & { userAnswer: string[] })[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
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
          setQuestions(allQuestions);
        }
      } catch (error) {
        console.error('获取题目失败:', error);
      }
    };

    fetchQuestions();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleOptionSelect = (questionId: number, optionId: string) => {
    const currentQuestion = questions[currentQuestionIndex];

    setSelectedOptions(prev => {
      if (currentQuestion.type === 'single') {
        return { ...prev, [questionId]: [optionId] };
      } else {
        const currentSelected = prev[questionId] || [];
        const newSelected = currentSelected.includes(optionId)
          ? currentSelected.filter(id => id !== optionId)
          : [...currentSelected, optionId];
        return { ...prev, [questionId]: newSelected };
      }
    });
  };

  const isOptionSelected = (questionId: number, optionId: string) => {
    const selectedForQuestion = selectedOptions[questionId] || [];
    return selectedForQuestion.includes(optionId);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    const wrongList: (QuestionWithFormattedOptions & { userAnswer: string[] })[] = [];

    questions.forEach((question) => {
      const userAnswer = selectedOptions[question.id] || [];
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

    const totalScore = Math.round((correctCount / questions.length) * 100);
    setScore(totalScore);
    setWrongQuestions(wrongList);
    setShowResult(true);
  };


  const arraysEqual = (userAnswer: string[], correctAnswer: string) => {
    // 去除空格并转为数组
    const correctAnswerArray = correctAnswer.replace(/\s+/g, '').split('');
    // 排序后比较数组内容
    return (
      userAnswer.sort().join('') === correctAnswerArray.sort().join('')
    );
  };

  if (showResult) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h2 className="text-2xl font-bold mb-8">考试结果</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-lg mb-4">你的得分：<span className="font-bold">{score}分</span></p>
          <div className="space-y-4">
            {wrongQuestions.map((question) => (
              <div key={`${question.type}-${question.id}`} className="border p-4 rounded-lg">
                <p className="font-medium">{question.question}</p>
                <p className="text-red-500">
                  你的答案：{(question.userAnswer || []).join('') || '未作答'}
                </p>
                <p className="text-green-500">
                  正确答案：{question.answer.replace(/\s+/g, '')}
                </p>

              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">加载题目中...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="fixed top-0 w-full bg-white shadow-sm z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600">DHUer专用</span>
            <span className="text-gray-600">{currentQuestionIndex + 1}/{questions.length}</span>
          </div>
          <div className="text-gray-600">
            <i className="fas fa-clock mr-2"></i>
            {formatTime(remainingTime)}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-24 px-4">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestionIndex + 1}. {currentQuestion.question}
            <span className="ml-2 text-sm text-gray-500">
              ({currentQuestion.type === 'single' ? '单选题' : '多选题'})
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={`${currentQuestion.type}-${currentQuestion.id}-${option.id}`}
              className={`w-full p-4 rounded-lg border transition-all duration-200 ${isOptionSelected(currentQuestion.id, option.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-200'
                }`}
              onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
            >
              <div className="flex items-start">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${isOptionSelected(currentQuestion.id, option.id)
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handlePrevQuestion}
            className={`px-6 py-2 rounded-lg ${currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white border border-blue-500 text-blue-500'
              }`}
            disabled={currentQuestionIndex === 0}
          >
            上一题
          </button>
          <button
            onClick={currentQuestionIndex === questions.length - 1 ? handleSubmit : handleNextQuestion}
            className={`px-6 py-2 rounded-lg ${currentQuestionIndex === questions.length - 1
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white'
              }`}
          >
            {currentQuestionIndex === questions.length - 1 ? '提交' : '下一题'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;