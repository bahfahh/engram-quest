// film.example.js — a complete small film, to copy and replace. The person (予安) and her notes are invented;
// the experiment quoted is real: Roediger & Karpicke (2006), Experiment 2. Reading four times: 83% after 5 minutes, 40% after a week.
// Reading once and recalling three times: 71% after 5 minutes, 61% after a week.
// Write your film as film.js beside this file: same shape, your content, the patterns that fit it.
// Colours: each skeleton question gets its own (set by skeleton()); inside a chapter green and coral mean good and cost, sand and slate are spare.
// film.gallery.js shows the beats this film does not use (comparison rows, two-axis map, time spans, an embedded figure).
import { opening, skeleton, chapter, sortInto, facets, optionCards, ladder, lanes, bars, relationMap, recall, closing } from './patterns.js';

const AREAS = [['學習', '2 個主題'], ['生活', '1 個主題']];
export const FILM = {
  id: 'example-study-method',
  topicId: 't-study-method',
  crumb: ['十月', '學習', '讀書方法'],
  badge: '示範・人物與筆記為虛構',
  chapters: [
    { name: '', run: opening({ year: '2026', month: '十月', count: '這個月，予安動過 3 個主題', areasTitle: '分在 2 個領域', areas: AREAS,
        pick: { index: 0, line: '其中一個，從九月的模擬考就開始了', topic: '讀書方法' },
        history: { title: '讀書方法：兩個月，三篇筆記', stops: [['9 月底', '模擬考檢討', '讀了四遍，隔週忘了一大半'], ['10 月中', '2006 年的實驗', '重讀和回想，誰留得久', 1], ['10 月底', '我的複習表', '一週怎麼排', 1]], note: '有光圈的是十月寫的' },
        question: '讀了那麼多遍，<br>為什麼還是忘？' }) },
    { name: '三個問題', run: skeleton({ title: '三個問題，照這個順序走', questions: [['為什麼會忘', '讀很多遍，留下的是什麼'], ['怎麼留得住', '哪一種練習有用'], ['怎麼排', '放進一週裡']], note: '每走完一個，回頭看它接到哪幾篇筆記。' }) },
    { name: '為什麼會忘', strip: 0, run: chapter({ index: 0, beats: [
        sortInto({ source: { title: '予安的模擬考檢討', lines: [['考前一晚，把重點讀了四遍'], ['讀到第四遍，每一段都很順'], ['隔週再考同一份'], ['忘了一大半']] },
          groups: [{ title: '熟悉感　｜　再看到時認得', color: 'coral', via: '重讀養出來的', items: ['這段我看過', '讀起來很順'], as: 'chips' }, { title: '想得出來　｜　蓋起來還講得出', color: 'green', via: '考試要的', items: ['不看書，說得出重點'], as: 'chips' }],
          caption: '重讀養出的是<span class="coral">熟悉感</span>；考試要的是<span class="green">想得出來</span>。' }),
        facets({ cols: [{ name: '熟悉感', color: 'coral', rows: [['是什麼', '再看到時，覺得認得'], ['怎麼來的', '同一段重複讀'], ['一週後', '還是覺得讀過，內容講不出來']] },
                        { name: '想得出來', color: 'green', rows: [['是什麼', '不看書，自己把內容講出來'], ['怎麼來的', '蓋起來回想，再對答案'], ['一週後', '大部分還在']] }],
          caption: '覺得會了，和真的會了，是兩件事。' })] }) },
    { name: '怎麼留得住', strip: 1, run: chapter({ index: 1, beats: [
        bars({ title: '同一篇文章，兩種讀法（2006 年的實驗）', rows: [
            { name: '讀四遍', sub: '5 分鐘後', value: 0.83, text: '83%', note: '記得', color: 'coral' }, { name: '讀四遍', sub: '一週後', value: 0.40, text: '40%', note: '掉了一半以上', color: 'coral' },
            { name: '讀一遍，回想三次', sub: '5 分鐘後', value: 0.71, text: '71%', note: '', color: 'green' }, { name: '讀一遍，回想三次', sub: '一週後', value: 0.61, text: '61%', note: '幾乎沒掉', color: 'green' }],
          note: '剛讀完，重讀的那一組比較好。一週後，反過來。' }),
        optionCards({ title: '三種複習，各留下什麼', cards: [
            { name: '重讀', sub: '再看一次', color: 'coral', lines: [['擅長', '很快覺得熟', 'green'], ['代價', '一週後掉最多', 'coral']], src: '模擬考檢討' },
            { name: '回想', sub: '蓋起來，自己講', color: 'green', lines: [['擅長', '一週後還在', 'green'], ['代價', '當下很吃力，覺得自己不會', 'coral']], src: '2006 年的實驗' },
            { name: '隔幾天再想', sub: '同一題，分開問', color: 'sand', lines: [['擅長', '留得更久', 'green'], ['代價', '要有人幫你記哪天該問', 'coral']], src: '我的複習表' }],
          caption: '吃力的那一種，留得住。' })] }) },
    { name: '怎麼排', strip: 2, run: chapter({ index: 2, beats: [
        ladder({ title: '讀完一段之後，一題一題問下去', questions: [
            { q: '蓋起來，講得出來嗎？', ex: '不看書，講給自己聽', yes: '講得出', to: '隔幾天再問', why: '先放著，不用再讀', color: 'green' },
            { q: '講到一半卡住？', ex: '只記得標題', yes: '卡住', to: '看答案，明天再問', why: '看完立刻蓋起來再講一次', color: 'coral' },
            { q: '連續三次都講得出？', ex: '隔了幾天還在', yes: '是', to: '拉長間隔', why: '下次隔一週以上', color: 'sand' }],
          caption: '每一次都先問自己，答案放在後面。' }),
        lanes({ lanes: [{ name: '以前', sub: '考前一晚', steps: [['讀'], ['讀'], ['讀'], ['讀'], ['考試']], tag: ['一週後忘一半', 'coral'] },
                        { name: '現在', sub: '分三天', steps: [['讀'], ['回想', 'green'], ['隔兩天回想', 'green'], ['隔四天回想', 'green'], ['考試']], tag: ['留得住', 'green'] }],
          rule: '時間一樣多，只是把「再讀」換成「回想」，再把它們分開。' })] }) },
    { name: '關聯圖', run: relationMap({ title: '這三篇筆記，怎麼接在一起', legend: '有光圈：十月寫的',
        sources: { exam: ['模擬考檢討', '9 月底'], study: ['2006 年的實驗', '10 月中', 1], plan: ['我的複習表', '10 月底', 1] },
        links: [[['exam', '自己遇到的事'], ['study', '為什麼會這樣']], [['study', '哪一種有用']], [['plan', '怎麼分開問'], ['study', '為什麼要分開']]],
        caption: '一件自己遇到的事，一個解釋，一張照著做的表。',
        outs: [['plan', '英文單字', '同一招：先想，再看', 'green']], outCaption: '這個主題，接到十月的另一個主題。' }) },
    { name: '回想', run: recall({ title: '遮掉關鍵字，先自己講一次', clue: '線索　那次模擬考，隔週又考了同一份',
        lines: ['重讀養出的是｛熟悉感｝，考試要的是｛想得出來｝。', '一週後還留著的，是｛回想｝的那一組。', '把回想｛分開｝在不同天，比同一天做完留得久。'],
        casesTitle: '換一個筆記裡沒有的情境', ask: '你會怎麼安排？',
        cases: [['下週要背 30 個咖啡產區的名字和風味。', '第一天看一遍就蓋起來，自己講；講不出的看答案。', '之後隔兩天、隔四天各再講一次。不要在同一晚讀很多遍。']] }) },
    { name: '你的判斷', run: closing({ lead: '筆記裡下的判斷', left: ['以前問', '「這段我讀了幾遍？」'], right: ['現在問', '「蓋起來，我講得出幾成？」'], verdict: '讀幾遍不重要，講得出來才算。',
        openLead: '筆記裡寫了、還沒做的事', open: '複習表排好了，還沒有照著做滿一週。',
        areas: AREAS, pick: { index: 0, done: '讀書方法　走過了' }, last: '這個主題的題目在 Review Deck，過幾天會再問你。' }) },
  ],
};
