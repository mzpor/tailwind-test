// 🎯 ماژول ارزیابی - نسخه 1.0.0
// مدیریت سوالات، پاسخ‌ها و نتایج ارزیابی

const fs = require('fs');
const path = require('path');

class EvaluationModule {
  constructor() {
    this.questionsFile = path.join(__dirname, 'data', 'evaluation_questions.json');
    this.resultsFile = path.join(__dirname, 'data', 'evaluation_results.json');
    this.questions = this.loadQuestions();
    this.results = this.loadResults();
    this.activeSessions = new Map();
    
    console.log('✅ [EVALUATION_MODULE] Module initialized successfully');
  }

  // بارگذاری سوالات از فایل
  loadQuestions() {
    try {
      if (fs.existsSync(this.questionsFile)) {
        const data = fs.readFileSync(this.questionsFile, 'utf8');
        const questions = JSON.parse(data);
        console.log(`✅ [EVALUATION_MODULE] Loaded ${questions.length} questions from file`);
        return questions;
      } else {
        // ایجاد سوالات پیش‌فرض
        const defaultQuestions = this.createDefaultQuestions();
        this.saveQuestions(defaultQuestions);
        return defaultQuestions;
      }
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error loading questions:', error);
      return this.createDefaultQuestions();
    }
  }

  // بارگذاری نتایج از فایل
  loadResults() {
    try {
      if (fs.existsSync(this.resultsFile)) {
        const data = fs.readFileSync(this.resultsFile, 'utf8');
        const results = JSON.parse(data);
        console.log(`✅ [EVALUATION_MODULE] Loaded ${Object.keys(results).length} result sets from file`);
        return results;
      } else {
        const defaultResults = {};
        this.saveResults(defaultResults);
        return defaultResults;
      }
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error loading results:', error);
      return {};
    }
  }

  // ایجاد سوالات پیش‌فرض
  createDefaultQuestions() {
    return [
      {
        id: 1,
        category: 'قرآن',
        question: 'سوره حمد چند آیه دارد؟',
        options: ['5 آیه', '6 آیه', '7 آیه', '8 آیه'],
        correctAnswer: 2,
        difficulty: 'آسان',
        explanation: 'سوره حمد 7 آیه دارد.'
      },
      {
        id: 2,
        category: 'قرآن',
        question: 'کدام سوره به قلب قرآن معروف است؟',
        options: ['سوره یس', 'سوره الرحمن', 'سوره الواقعه', 'سوره الملک'],
        correctAnswer: 0,
        difficulty: 'متوسط',
        explanation: 'سوره یس به قلب قرآن معروف است.'
      },
      {
        id: 3,
        category: 'احکام',
        question: 'نماز صبح چند رکعت است؟',
        options: ['2 رکعت', '3 رکعت', '4 رکعت', '5 رکعت'],
        correctAnswer: 0,
        difficulty: 'آسان',
        explanation: 'نماز صبح 2 رکعت است.'
      },
      {
        id: 4,
        category: 'احکام',
        question: 'کدام یک از ارکان نماز نیست؟',
        options: ['قیام', 'رکوع', 'سجده', 'تکبیر'],
        correctAnswer: 3,
        difficulty: 'متوسط',
        explanation: 'تکبیر از ارکان نماز نیست، بلکه از مستحبات است.'
      },
      {
        id: 5,
        category: 'اخلاق',
        question: 'کدام یک از صفات نیک است؟',
        options: ['دروغگویی', 'امانت‌داری', 'خیانت', 'بدگویی'],
        correctAnswer: 1,
        difficulty: 'آسان',
        explanation: 'امانت‌داری از صفات نیک و پسندیده است.'
      }
    ];
  }

  // ذخیره سوالات در فایل
  saveQuestions(questions = null) {
    try {
      const questionsToSave = questions || this.questions;
      const dataDir = path.dirname(this.questionsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.questionsFile, JSON.stringify(questionsToSave, null, 2), 'utf8');
      console.log('✅ [EVALUATION_MODULE] Questions saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error saving questions:', error);
      return false;
    }
  }

  // ذخیره نتایج در فایل
  saveResults(results = null) {
    try {
      const resultsToSave = results || this.results;
      const dataDir = path.dirname(this.resultsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.resultsFile, JSON.stringify(resultsToSave, null, 2), 'utf8');
      console.log('✅ [EVALUATION_MODULE] Results saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error saving results:', error);
      return false;
    }
  }

  // شروع جلسه ارزیابی
  startEvaluationSession(sessionId, config) {
    try {
      const { questionsPerEvaluation, evaluationDuration, passingScore } = config;
      
      // انتخاب تصادفی سوالات
      const selectedQuestions = this.selectRandomQuestions(questionsPerEvaluation);
      
      const session = {
        id: sessionId,
        startTime: new Date(),
        endTime: new Date(Date.now() + evaluationDuration * 60000),
        duration: evaluationDuration,
        questions: selectedQuestions,
        passingScore: passingScore,
        participants: new Map(),
        status: 'active'
      };

      this.activeSessions.set(sessionId, session);
      console.log(`✅ [EVALUATION_MODULE] Evaluation session ${sessionId} started with ${selectedQuestions.length} questions`);
      
      return session;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error starting evaluation session:', error);
      return null;
    }
  }

  // انتخاب تصادفی سوالات
  selectRandomQuestions(count) {
    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.questions.length));
  }

  // ثبت‌نام شرکت‌کننده در ارزیابی
  registerParticipant(sessionId, userId, userName) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.participants.has(userId)) {
        throw new Error('Participant already registered');
      }

      const participant = {
        userId: userId,
        userName: userName,
        startTime: new Date(),
        answers: [],
        score: 0,
        status: 'active'
      };

      session.participants.set(userId, participant);
      console.log(`✅ [EVALUATION_MODULE] Participant ${userName} (${userId}) registered for session ${sessionId}`);
      
      return participant;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error registering participant:', error);
      return null;
    }
  }

  // ثبت پاسخ شرکت‌کننده
  submitAnswer(sessionId, userId, questionId, answerIndex) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const participant = session.participants.get(userId);
      if (!participant) {
        throw new Error('Participant not registered');
      }

      // بررسی اینکه آیا قبلاً به این سوال پاسخ داده شده
      const existingAnswer = participant.answers.find(a => a.questionId === questionId);
      if (existingAnswer) {
        throw new Error('Question already answered');
      }

      // پیدا کردن سوال
      const question = session.questions.find(q => q.id === questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      // بررسی صحت پاسخ
      const isCorrect = answerIndex === question.correctAnswer;
      const score = isCorrect ? 100 : 0;

      // ثبت پاسخ
      const answer = {
        questionId: questionId,
        answerIndex: answerIndex,
        isCorrect: isCorrect,
        score: score,
        timestamp: new Date()
      };

      participant.answers.push(answer);
      participant.score = this.calculateScore(participant.answers);

      console.log(`✅ [EVALUATION_MODULE] Answer submitted for participant ${userId} in session ${sessionId}`);
      
      return {
        isCorrect: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        currentScore: participant.score
      };
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error submitting answer:', error);
      return null;
    }
  }

  // محاسبه نمره
  calculateScore(answers) {
    if (answers.length === 0) return 0;
    
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    return Math.round(totalScore / answers.length);
  }

  // پایان جلسه ارزیابی
  endEvaluationSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.status = 'completed';
      session.endTime = new Date();

      // محاسبه نتایج نهایی
      const results = this.calculateFinalResults(session);
      
      // ذخیره نتایج
      this.results[sessionId] = results;
      this.saveResults();

      // حذف از جلسات فعال
      this.activeSessions.delete(sessionId);

      console.log(`✅ [EVALUATION_MODULE] Evaluation session ${sessionId} ended and results saved`);
      
      return results;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error ending evaluation session:', error);
      return null;
    }
  }

  // محاسبه نتایج نهایی
  calculateFinalResults(session) {
    const participants = Array.from(session.participants.values());
    const results = {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      totalParticipants: participants.length,
      participants: participants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        score: p.score,
        passed: p.score >= session.passingScore,
        answersCount: p.answers.length,
        completionTime: p.startTime ? new Date(p.startTime.getTime() + session.duration * 60000) : null
      })),
      statistics: {
        averageScore: participants.length > 0 ? 
          Math.round(participants.reduce((sum, p) => sum + p.score, 0) / participants.length) : 0,
        passedCount: participants.filter(p => p.score >= session.passingScore).length,
        failedCount: participants.filter(p => p.score < session.passingScore).length,
        completionRate: participants.length > 0 ? 
          Math.round((participants.filter(p => p.answers.length === session.questions.length).length / participants.length) * 100) : 0
      }
    };

    return results;
  }

  // دریافت وضعیت جلسه
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      questionsCount: session.questions.length,
      participantsCount: session.participants.size,
      remainingTime: Math.max(0, session.endTime.getTime() - Date.now())
    };
  }

  // دریافت وضعیت شرکت‌کننده
  getParticipantStatus(sessionId, userId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const participant = session.participants.get(userId);
    if (!participant) return null;

    return {
      userId: participant.userId,
      userName: participant.userName,
      startTime: participant.startTime,
      answersCount: participant.answers.length,
      score: participant.score,
      status: participant.status,
      remainingQuestions: session.questions.length - participant.answers.length
    };
  }

  // اضافه کردن سوال جدید
  addQuestion(question) {
    try {
      if (!question.question || !question.options || question.correctAnswer === undefined) {
        throw new Error('Invalid question format');
      }

      question.id = this.questions.length > 0 ? Math.max(...this.questions.map(q => q.id)) + 1 : 1;
      question.createdAt = new Date().toISOString();

      this.questions.push(question);
      this.saveQuestions();

      console.log(`✅ [EVALUATION_MODULE] New question added with ID: ${question.id}`);
      return question.id;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error adding question:', error);
      return null;
    }
  }

  // ویرایش سوال
  editQuestion(questionId, updates) {
    try {
      const questionIndex = this.questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) {
        throw new Error('Question not found');
      }

      this.questions[questionIndex] = { ...this.questions[questionIndex], ...updates };
      this.questions[questionIndex].updatedAt = new Date().toISOString();

      this.saveQuestions();

      console.log(`✅ [EVALUATION_MODULE] Question ${questionId} updated successfully`);
      return true;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error editing question:', error);
      return false;
    }
  }

  // حذف سوال
  deleteQuestion(questionId) {
    try {
      const questionIndex = this.questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) {
        throw new Error('Question not found');
      }

      this.questions.splice(questionIndex, 1);
      this.saveQuestions();

      console.log(`✅ [EVALUATION_MODULE] Question ${questionId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ [EVALUATION_MODULE] Error deleting question:', error);
      return false;
    }
  }

  // دریافت تمام سوالات
  getAllQuestions() {
    return [...this.questions];
  }

  // دریافت سوالات بر اساس دسته‌بندی
  getQuestionsByCategory(category) {
    return this.questions.filter(q => q.category === category);
  }

  // دریافت سوالات بر اساس سطح دشواری
  getQuestionsByDifficulty(difficulty) {
    return this.questions.filter(q => q.difficulty === difficulty);
  }

  // دریافت نتایج جلسه
  getSessionResults(sessionId) {
    return this.results[sessionId] || null;
  }

  // دریافت تمام نتایج
  getAllResults() {
    return { ...this.results };
  }

  // پاک کردن تاریخچه
  clearHistory() {
    this.results = {};
    this.activeSessions.clear();
    this.saveResults();
    console.log('✅ [EVALUATION_MODULE] History cleared successfully');
  }
}

// ایجاد نمونه از کلاس
const evaluationModule = new EvaluationModule();

module.exports = {
  EvaluationModule,
  evaluationModule
};
