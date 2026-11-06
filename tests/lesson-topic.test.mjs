import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLessonTopic, prepareLessonRequest } from '../worker/lesson-topic.js';

const maths={topic:'分数的初步认识',subject:'数学',grade:'三年级',minutes:40};
const chinese={topic:'《背影》中的细节描写',subject:'语文',grade:'八年级',minutes:40};

test('prepares topic-specific guidance with optional conditions and discards an unrelated current lesson',()=>{
 const input={brief:{...maths,resources:'折纸和彩笔'},current:{title:'物体的沉与浮'}};
 const prepared=prepareLessonRequest(input);
 assert.equal(prepared.current,null);
 assert.equal(prepared.brief.resources,'折纸和彩笔');
 assert.match(prepared.brief.prior,/待确认/);
 assert.match(prepared.brief.requirements,/分数的初步认识/);
 assert.deepEqual(prepareLessonRequest(prepared),prepared);
 assert.equal(input.current.title,'物体的沉与浮');
});

test('prevents a wrong title or buoyancy sample from being applied to a different topic',()=>{
 assert.throws(()=>assertLessonTopic({title:'物体的沉与浮'},maths,{checkTitle:true}),/标题与当前课题/);
 assert.throws(()=>assertLessonTopic({
  title:maths.topic,phases:[{name:'猜一猜谁沉谁浮'}],keypoints:['对照橡皮泥改形后的沉浮'],
 },maths,{checkTitle:true}),/混入.*沉浮/);
 assert.throws(()=>assertLessonTopic({homework:['寻找生活中的沉浮例子']},chinese),/混入.*沉浮/);
 assert.throws(()=>assertLessonTopic({title:'C 语言入门'},{topic:'C++'},{checkTitle:true}),/标题与当前课题/);
 assert.doesNotThrow(()=>assertLessonTopic({
  title:'背影中的细节描写：从动作读情感',phases:[{name:'圈画攀爬月台时的动作'}],
 },chinese,{checkTitle:true}));
 assert.doesNotThrow(()=>assertLessonTopic({
  title:'物体的沉与浮',phases:[{name:'比较橡皮泥改形前后的沉浮'}],
 },{topic:'物体的沉与浮',subject:'科学'},{checkTitle:true}));
});
