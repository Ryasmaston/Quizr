import { useState } from "react";

export function QuizStats({ quiz, onClose }) {
  if (!quiz) return null;

  const attempts = quiz.attempts || [];
  const totalAttempts = attempts.length;
  const questionCount = quiz.questions?.length || 0;

  const passes = attempts.filter(attempt => {
    const percentage = questionCount > 0 ? (attempt.correct / questionCount) * 100 : 0;
    return percentage >= 60;
  }).length;

  const passRate = totalAttempts > 0 ? Math.round((passes / totalAttempts) * 100) : 0;
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.correct, 0);
  const totalQuestions = totalAttempts * questionCount;
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const uniqueUsers = new Set(attempts.map(a => a.user_id.toString())).size;

  const scoreDistribution = {
    excellent: 0, // 80-100%
    good: 0,      // 60-79%
    fair: 0,      // 40-59%
    poor: 0       // 0-39%
  };

  attempts.forEach(attempt => {
    const percentage = questionCount > 0 ? (attempt.correct / questionCount) * 100 : 0;
    if (percentage >= 80) scoreDistribution.excellent++;
    else if (percentage >= 60) scoreDistribution.good++;
    else if (percentage >= 40) scoreDistribution.fair++;
    else scoreDistribution.poor++;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-white mb-2">Quiz Statistics</h2>
              <p className="text-gray-300 text-sm">{quiz.title}</p>
              <p className="text-gray-400 text-xs mt-1">Category: {quiz.category}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
                {totalAttempts}
              </div>
              <div className="text-gray-300 text-sm">Total Attempts</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                {uniqueUsers}
              </div>
              <div className="text-gray-300 text-sm">Unique Users</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="text-center mb-3">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
                  {passRate}%
                </div>
                <div className="text-gray-300 text-sm">Pass Rate</div>
              </div>
              <div className="text-center text-gray-400 text-xs">
                {passes} of {totalAttempts} passed
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="text-center mb-3">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2">
                  {averageScore}%
                </div>
                <div className="text-gray-300 text-sm">Average Score</div>
              </div>
              <div className="text-center text-gray-400 text-xs">
                Across all attempts
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4">Score Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300">Excellent (80-100%)</span>
                  <span className="text-green-400 font-semibold">{scoreDistribution.excellent}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: totalAttempts > 0 ? `${(scoreDistribution.excellent / totalAttempts) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300">Good (60-79%)</span>
                  <span className="text-blue-400 font-semibold">{scoreDistribution.good}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: totalAttempts > 0 ? `${(scoreDistribution.good / totalAttempts) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300">Fair (40-59%)</span>
                  <span className="text-amber-400 font-semibold">{scoreDistribution.fair}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: totalAttempts > 0 ? `${(scoreDistribution.fair / totalAttempts) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300">Needs Improvement (0-39%)</span>
                  <span className="text-red-400 font-semibold">{scoreDistribution.poor}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500"
                    style={{ width: totalAttempts > 0 ? `${(scoreDistribution.poor / totalAttempts) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4">Quiz Details</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Questions</span>
                <span className="font-semibold text-white">{questionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pass Threshold</span>
                <span className="font-semibold text-white">{quiz.req_to_pass || 60}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Created By</span>
                <span className="font-semibold text-white">
                  {quiz.created_by?.username || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          {totalAttempts === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Attempts Yet</h3>
              <p className="text-gray-300">Statistics will appear once users start taking this quiz</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
