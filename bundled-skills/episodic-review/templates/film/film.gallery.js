// film.gallery.js — the beats film.example.js does not use, one after another, so they can be seen before choosing:
//   node render_stage.cjs projects/<id> --film gallery --stills auto
// Same invented person and notes as the example. Not a film to deliver.
import { skeleton, chapter, table, axisMap, spans, figure, monthMap, recall } from './patterns.js';

export const FILM = {
  id: 'gallery', topicId: 't-study-method', crumb: ['示範', '展示方式'], badge: '展示方式一覽',
  chapters: [
    { name: '', run: skeleton({ title: '一支短片：三個問題走其中兩個', questions: [['為什麼會忘', '讀很多遍，留下的是什麼'], ['怎麼留得住', '哪一種練習有用'], ['怎麼排', '放進一週裡']],
        taken: [1, 2], skipNote: '第一個問題這支片不走，它的題目在 Review Deck。' }) },
    { name: '怎麼留得住', strip: 1, run: chapter({ index: 1, beats: [
        table({ title: '同一件事，三篇筆記各自怎麼說', heads: ['筆記', '怎麼說', '屬於'], rows: [
            { name: '模擬考檢討', when: '9 月底', mid: '讀了四遍，隔週忘了一大半', tags: [['自己遇到的事', 'sand']] },
            { name: '2006 年的實驗', when: '10 月中', mid: '回想三次，一週後還有 61%', tags: [['別人的數字', 'slate']] },
            { name: '我的複習表', when: '10 月底', mid: '隔兩天、隔四天各問一次', tags: [['照著做的規則', 'green']] }],
          caption: '三篇講的是同一件事，分別是經驗、證據、做法。' }),
        axisMap({ title: '四種複習，放在兩條軸上', x: ['當下輕鬆', '當下吃力'], y: ['一週後忘掉', '一週後還在'],
          items: [{ name: '重讀', sub: '最輕鬆，留最少', x: 0.12, y: 0.15, color: 'coral' }, { name: '畫重點', sub: '和重讀差不多', x: 0.3, y: 0.24, color: 'coral' },
                  { name: '回想', sub: '吃力，留得住', x: 0.72, y: 0.7, color: 'green' }, { name: '隔幾天再回想', sub: '最吃力，留最久', x: 0.86, y: 0.9, color: 'green' }],
          zone: { from: [0, 0], to: [0.45, 0.4], text: '覺得會了的區域', color: 'coral' },
          target: { name: '予安現在', sub: '還在重讀', x: 0.16, y: 0.42, toward: [0.7, 0.82], via: '把「再讀」換成「回想」' },
          caption: '越吃力的，一週後留得越多。' })] }) },
    { name: '怎麼排', strip: 2, run: chapter({ index: 2, beats: [
        spans({ title: '一章的複習，排進兩週', last: 14, ticks: [[0, '第 1 天'], [2, '第 3 天'], [6, '第 7 天'], [13, '第 14 天']],
          rows: [{ name: '讀', sub: '只讀一遍', from: 0, to: 1, text: '讀完就蓋起來' },
                 { name: '回想', sub: '不看書', from: 0, to: 0, text: '當天講一次', see: '卡住才看答案' },
                 { name: '隔天再問', sub: '同一題', from: 2, to: 3, text: '第 3 天' },
                 { name: '拉長間隔', sub: '三次都講得出', from: 6, to: 13, text: '第 7 天之後，隔一週以上', color: 'green' }],
          mark: [6, '第 7 天：講不出來的，回到隔天再問'], caption: '時間沒有變多，只是分開了。' }),
        figure({ title: '筆記裡原本就有的圖：直接放上來，再指給他看', src: 'figs/example.svg', w: 980, h: 540,
          points: [{ at: [0.2, 0.42], label: '紅線', text: '讀完不管它，兩天就掉了一大半。', color: 'coral' },
                   { at: [0.345, 0.25], label: '第 2 天', text: '回想一次，線被拉回來。', color: 'green' },
                   { at: [0.625, 0.23], label: '第 6 天', text: '再一次，之後掉得更慢。', color: 'green' },
                   { label: '這張圖沒說的', text: '間隔該多長，筆記裡沒有寫。' }],
          caption: '每回想一次，忘得更慢。' })] }) },
    // for a film about the whole month: topics by area, the real links one at a time, then the ones that stand alone; then one quick question per topic
    { name: '這個月', run: monthMap({ title: '十月：7 個主題，怎麼接在一起',
        areas: [{ name: '學習', topics: [['study', '讀書方法'], ['vocab', '英文單字'], ['notes', '筆記怎麼寫']] }, { name: '生活', topics: [['sleep', '睡眠'], ['coffee', '手沖咖啡']] }, { name: '工作', topics: [['meet', '開會紀錄'], ['plan', '週計畫']] }],
        links: [['study', 'vocab', '背單字用的是讀書方法裡的同一招：先想，再看。'], ['notes', 'meet', '開會紀錄照「筆記怎麼寫」的格式：先寫結論。'], ['sleep', 'study', '睡眠那篇引了同一個實驗：睡前回想留得更久。']],
        shared: [['plan', 'notes', '同一篇筆記：〈每週回顧範本〉兩邊都收了。']],
        alone: '手沖咖啡這個月沒有接到別的主題。', caption: '三條連結，都繞著「先想，再看」。' }) },
    { name: '快問', cue: 'topic', run: recall({ casesTitle: '每個主題一題', ask: '先自己講一次。',
        cases: [['為什麼讀四遍，隔週還是忘？', '重讀養出的是熟悉感，不是想得出來。', '一週後還留著的，是回想的那一組。', '線索　那次模擬考', '讀書方法'],
                ['手沖時水溫太高，味道會怎樣？', '偏苦。', '萃取過頭；筆記裡寫的是降到 90 度上下再試。', '線索　上次那包淺焙', '手沖咖啡']] }) },
  ],
};
