import{D as it,A as ue,aZ as S,j as ct,ey as C,ew as V,go as B,fK as K,f6 as z,gu as fe,eD as O,aD as he,gE as de,f7 as pe,P as ge,gF as me,gv as j,eq as nt,i as ut,et as P,gC as ft,f5 as R,Q as ht,gG as dt,aq as pt,as as gt,at as mt,au as It,gI as wt,aC as xt,gJ as kt,gK as bt,aK as yt,aR as Et,b0 as St,b5 as Rt,fo as Ie,b6 as we,gD as vt,b_ as xe,aY as ke,eZ as be,bh as ye,Y as Tt,ac as Ee,eB as Se,aO as Re,iL as ve,iM as Te,iN as Ne,iO as Me,iP as Pe,dm as Ce,r as Fe,cl as De,bv as Nt,eT as H,bB as Mt,gA as Ve,gB as Ae,iQ as Oe,bH as qe,bI as Le,gz as $e,iR as ze,iS as je,iT as Ge,iU as We,iV as Be,iW as _e,iX as Ke,iY as Ue,iZ as st,i_ as Ze,i$ as Xe,j0 as He,bR as Pt,bT as Ct,gL as Ft,ep as X,j1 as Ye,bV as Dt,j2 as L}from"./graph_model-7P1Y5XAB.js";/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function A(n,e){Array.isArray(n)||(n=[n]),n.forEach(t=>{t!=null&&it(t.dtype!=="complex64",()=>`${e} does not support complex64 tensors in the CPU backend.`)})}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Vt(n){const e=new Float32Array(n.length);for(let t=0;t<n.length;++t)e[t]=Math.abs(n[t]);return e}const Qe=n=>{const{x:e}=n.inputs,t=n.backend;A(e,"abs");let s=new Float32Array(S(e.shape));const o=t.data.get(e.dataId).values;return s=Vt(o),t.makeOutput(s,e.shape,e.dtype)},is={kernelName:ue,backendName:"cpu",kernelFunc:Qe};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function v(n){return(e,t,s,o,l)=>{const r=ct(e,t),i=r.length,a=C(r),c=S(r),f=V(l,c),u=e.length,g=t.length,m=C(e),d=C(t),w=B(e,r),h=B(t,r);if(w.length+h.length===0)for(let p=0;p<f.length;++p)f[p]=n(s[p%s.length],o[p%o.length]);else for(let p=0;p<f.length;++p){const I=K(p,i,a),k=I.slice(-u);w.forEach(E=>k[E]=0);const x=z(k,u,m),b=I.slice(-g);h.forEach(E=>b[E]=0);const y=z(b,g,d);f[p]=n(s[x],o[y])}return[f,r]}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function U(n){const{inputs:e,backend:t}=n,{real:s,imag:o}=e,l=t.data.get(s.dataId).values,r=t.data.get(o.dataId).values,i=t.makeTensorInfo(s.shape,"complex64"),a=t.data.get(i.dataId);return a.complexTensorInfos={real:t.makeTensorInfo(s.shape,"float32",l),imag:t.makeTensorInfo(o.shape,"float32",r)},i}const cs={kernelName:fe,backendName:"cpu",kernelFunc:U};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Y(n,e,t="float32"){if(t==="complex64"){const o=Y(n,e,"float32"),l=Y(n,e,"float32");return U({inputs:{real:o,imag:l},backend:n})}const s=O(S(e),t);return n.makeTensorInfo(e,t,s)}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Q(n){const{inputs:e,backend:t}=n,{x:s}=e;return t.incRef(s.dataId),{dataId:s.dataId,shape:s.shape,dtype:s.dtype}}const us={kernelName:he,backendName:"cpu",kernelFunc:Q};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function At(n){const{inputs:e,backend:t}=n,{input:s}=e,o=t.data.get(s.dataId).complexTensorInfos.real,l=t.data.get(o.dataId).values;return t.makeTensorInfo(o.shape,o.dtype,l)}const fs={kernelName:de,backendName:"cpu",kernelFunc:At};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ot(n,e,t,s){if(s==="int32"){const o=Int32Array.from(n);return[e,"int32",o]}if(s==="bool"){const o=pe([0],t),[l,r]=v((i,a)=>i!==a?1:0)(e,[],n,o,"bool");return[r,"bool",l]}throw new Error(`Error in Cast: failed to cast ${t} to ${s}`)}function G(n){const{inputs:e,backend:t,attrs:s}=n,{x:o}=e,{dtype:l}=s;if(l==="complex64"){if(o.dtype==="complex64")return Q({inputs:{x:o},backend:t});const f=Y(t,o.shape,o.dtype),u=G({inputs:{x:o},backend:t,attrs:{dtype:"float32"}}),g=U({inputs:{real:u,imag:f},backend:t});return t.disposeIntermediateTensorInfo(f),t.disposeIntermediateTensorInfo(u),g}if(o.dtype==="complex64"){const f=At({inputs:{input:o},backend:t}),u=G({inputs:{x:f},backend:t,attrs:{dtype:l}});return t.disposeIntermediateTensorInfo(f),u}if(!me(o.dtype,l)){const f=Q({inputs:{x:o},backend:t});return{dataId:f.dataId,shape:f.shape,dtype:l}}const r=t.data.get(o.dataId).values,[i,a,c]=Ot(r,o.shape,o.dtype,l);return t.makeTensorInfo(i,a,c)}const hs={kernelName:ge,backendName:"cpu",kernelFunc:G};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function T(n,e,t,s){return t==null?({inputs:o,backend:l})=>{const{a:r,b:i}=o,a=l;A([r,i],n);const c=a.data.get(r.dataId).values,f=a.data.get(i.dataId).values,u=r.dtype==="string"?j(c):c,g=r.dtype==="string"?j(f):f,m=s||r.dtype,[d,w]=e(r.shape,i.shape,u,g,m);return a.makeTensorInfo(w,m,d)}:({inputs:o,backend:l})=>{const{a:r,b:i}=o,a=l;if(r.dtype==="complex64"||i.dtype==="complex64"){const c=G({inputs:{x:r},backend:a,attrs:{dtype:"complex64"}}),f=a.data.get(c.dataId),u=f.complexTensorInfos.real,g=f.complexTensorInfos.imag,m=a.data.get(u.dataId).values,d=a.data.get(g.dataId).values,w=G({inputs:{x:i},backend:a,attrs:{dtype:"complex64"}}),h=a.data.get(w.dataId),p=h.complexTensorInfos.real,I=h.complexTensorInfos.imag,k=a.data.get(p.dataId).values,x=a.data.get(I.dataId).values,[b,y,E]=t(r.shape,i.shape,m,d,k,x),N=a.makeTensorInfo(E,"float32",b),q=a.makeTensorInfo(E,"float32",y),W=U({inputs:{real:N,imag:q},backend:a});return a.disposeIntermediateTensorInfo(c),a.disposeIntermediateTensorInfo(w),a.disposeIntermediateTensorInfo(N),a.disposeIntermediateTensorInfo(q),W}else{const c=a.data.get(r.dataId).values,f=a.data.get(i.dataId).values,u=s||r.dtype,[g,m]=e(r.shape,i.shape,c,f,u);return a.makeTensorInfo(m,u,g)}}}function J(n){return(e,t,s,o,l,r)=>{const i=ct(e,t),a=S(i),c=i.length,f=C(i),u=V("float32",a),g=V("float32",a),m=B(e,i),d=B(t,i),w=nt(s,o),h=nt(l,r),p=e.length,I=C(e),k=t.length,x=C(t);if(m.length+d.length===0)for(let b=0;b<u.length;b++){const y=b%w.length,E=b%h.length,N=n(w[y*2],w[y*2+1],h[E*2],h[E*2+1]);u[b]=N.real,g[b]=N.imag}else for(let b=0;b<u.length;b++){const y=K(b,c,f),E=y.slice(-p);m.forEach(Z=>E[Z]=0);const N=z(E,p,I),q=y.slice(-k);d.forEach(Z=>q[Z]=0);const W=z(q,k,x),et=n(w[N*2],w[N*2+1],h[W*2],h[W*2+1]);u[b]=et.real,g[b]=et.imag}return[u,g,i]}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const qt=v(((n,e)=>n+e)),Je=J(((n,e,t,s)=>({real:n+t,imag:e+s}))),tn=T(ut,qt,Je),ds={kernelName:ut,backendName:"cpu",kernelFunc:tn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function en(n,e,t,s,o){const l=S(s),r=O(o,t);for(let i=0;i<n.length;i++){const a=n[i];if(a<0)throw new Error("Input x must be non-negative!");a>=o||(l>0?r[a]+=e[i]:r[a]+=1)}return r}function nn(n,e,t,s=!1){const o=n.shape[0],l=n.shape[1],r=P([o,t],e.dtype);for(let i=0;i<o;i++)for(let a=0;a<l;a++){const c=n.get(i,a);if(c<0)throw new Error("Input x must be non-negative!");c>=t||(s?r.set(1,i,c):e.size>0?r.set(r.get(i,c)+e.get(i,a),i,c):r.set(r.get(i,c)+1,i,c))}return r}/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Lt=v(((n,e)=>n&e)),sn=T(ft,Lt),ps={kernelName:ft,backendName:"cpu",kernelFunc:sn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function F(n){return(e,t,s)=>{const o=R(t,e.length);for(let l=0;l<e.length;++l)o[l]=n(e[l],s);return o}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function $t(n,e,t){const s=F(e);return D(n,s,t)}function D(n,e,t){return({inputs:s,attrs:o,backend:l})=>{const{x:r}=s;A(r,n);const i=l,a=i.data.get(r.dataId).values;let c;if(r.dtype==="string"){if(!Array.isArray(a))throw new Error("String tensor's value was not an instance of Array");c=j(a)}else c=a;const f=t||r.dtype,u=e(c,f,o);return i.makeTensorInfo(r.shape,f,u)}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const zt=F(n=>Math.ceil(n)),on=D(ht,zt),gs={kernelName:ht,backendName:"cpu",kernelFunc:on};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function an(n,e,t,s){const o=R(t,S(e));if(s&&t!=="string"){let l=0;n.forEach(r=>{const i=S(r.shape);o.set(r.vals,l),l+=i})}else{let l=0;n.forEach(r=>{const i=t==="string"?j(r.vals):r.vals;let a=0;for(let c=0;c<r.shape[0];++c){const f=c*e[1]+l;for(let u=0;u<r.shape[1];++u)o[f+u]=i[a++]}l+=r.shape[1]})}return o}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const jt=v((n,e)=>n===e?1:0),rn=T(dt,jt,null,"bool"),ms={kernelName:dt,backendName:"cpu",kernelFunc:rn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Gt=F(n=>Math.exp(n)),ln=D(pt,Gt,"float32"),Is={kernelName:pt,backendName:"cpu",kernelFunc:ln};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Wt=F(n=>Math.expm1(n)),cn=D(gt,Wt),ws={kernelName:gt,backendName:"cpu",kernelFunc:cn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Bt=F(n=>Math.floor(n)),un=D(mt,Bt),xs={kernelName:mt,backendName:"cpu",kernelFunc:un};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const _t=v((n,e)=>Math.floor(n/e)),fn=T(It,_t,null,"int32"),ks={kernelName:It,backendName:"cpu",kernelFunc:fn};/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function hn(n,e,t,s,o,l,r,i,a){const c=P([s,l],t);for(let f=0;f<s;f++){const u=[];let g=0;for(let m=0;m<o;m++){const d=n[f*o+m];g+=d*r[m],u.push(d)}if(g<0||g>=a/l)throw new Error(`Invalid indices: ${u} does not index into ${i}`);for(let m=0;m<l;m++)c.values[f*l+m]=e.get(...e.indexToLoc(g*l+m))}return c}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function dn(n,e,t){const s=P(t,n.dtype);for(let o=0;o<s.size;++o){const r=s.indexToLoc(o).slice(),i=r[0],a=r[2],c=e.locToIndex([i,a]);r[2]=e.values[c];const f=n.locToIndex(r);0<=f&&f<n.values.length&&(s.values[o]=n.values[f])}return s}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Kt=v((n,e)=>n>e?1:0),pn=T(wt,Kt,null,"bool"),bs={kernelName:wt,backendName:"cpu",kernelFunc:pn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Ut=v((n,e)=>n>=e?1:0),gn=T(xt,Ut,null,"bool"),ys={kernelName:xt,backendName:"cpu",kernelFunc:gn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Zt=v((n,e)=>n<e?1:0),mn=T(kt,Zt,null,"bool"),Es={kernelName:kt,backendName:"cpu",kernelFunc:mn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Xt=v((n,e)=>n<=e?1:0),In=T(bt,Xt,null,"bool"),Ss={kernelName:bt,backendName:"cpu",kernelFunc:In};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function wn(n,e,t){const s=(e-n)/(t-1),o=O(t,"float32");o[0]=n;for(let l=1;l<o.length;l++)o[l]=o[l-1]+s;return o}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Ht=F(n=>Math.log(n)),xn=D(yt,Ht),Rs={kernelName:yt,backendName:"cpu",kernelFunc:xn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function kn(n,e,t,s){const o=V(s,S(t));for(let l=0;l<o.length;++l){const r=l*e;let i=n[r];for(let a=0;a<e;++a){const c=n[r+a];(Number.isNaN(c)||c>i)&&(i=c)}o[l]=i}return o}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Yt=v(((n,e)=>Math.max(n,e))),bn=T(Et,Yt),vs={kernelName:Et,backendName:"cpu",kernelFunc:bn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Qt=v(((n,e)=>Math.min(n,e))),yn=T(St,Qt),Ts={kernelName:St,backendName:"cpu",kernelFunc:yn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const tt=v(((n,e)=>n*e)),En=J(((n,e,t,s)=>({real:n*t-e*s,imag:n*s+e*t}))),Sn=T(Rt,tt,En),Ns={kernelName:Rt,backendName:"cpu",kernelFunc:Sn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Jt(n,e,t){const s=Ie(-1,t);return tt([],e,s,n,t)}function Rn(n){const{inputs:e,backend:t}=n,{x:s}=e;A(s,"neg");const o=t.data.get(s.dataId).values,[l,r]=Jt(o,s.shape,s.dtype);return t.makeTensorInfo(r,s.dtype,l)}const Ms={kernelName:we,backendName:"cpu",kernelFunc:Rn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const te=v(((n,e)=>n!==e?1:0)),vn=T(vt,te,null,"bool"),Ps={kernelName:vt,backendName:"cpu",kernelFunc:vn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ee(n,e,t,s,o){const l=e.length,r=S(e),i=C(e),a=C(o),c=V(t,S(o));for(let f=0;f<r;++f){const u=K(f,l,i),g=new Array(u.length);for(let d=0;d<g.length;d++)g[d]=u[s[d]];const m=z(g,l,a);c[m]=n[f]}return c}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ne(n){const{inputs:e,attrs:t,backend:s}=n,{x:o}=e,{perm:l}=t;A(o,"transpose");const r=o.shape.length,i=new Array(r);for(let u=0;u<i.length;u++)i[u]=o.shape[l[u]];const a=s.data.get(o.dataId).values,c=ee(a,o.shape,o.dtype,l,i);return{dataId:s.write(c,i,o.dtype),shape:i,dtype:o.dtype}}const Cs={kernelName:xe,backendName:"cpu",kernelFunc:ne};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function se(n,e,t,s){const[o,l]=ke(n,s),r=be(e,"int32"),i=O(S(o),r),a=S(l);for(let c=0;c<i.length;++c){const f=c*a;let u=1;for(let g=0;g<a;++g)u*=t[f+g];i[c]=u}return{outVals:i,outShape:o,outDtype:r}}function Tn(n){const{inputs:e,backend:t,attrs:s}=n,{x:o}=e,{axis:l,keepDims:r}=s;A(o,"prod");const i=o.shape.length,a=Tt(l,o.shape),c=Ee(a,i);let f=a,u=o;const g=[];c!=null&&(u=ne({inputs:{x:o},backend:t,attrs:{perm:c}}),g.push(u),f=Se(f.length,i));const m=t.data.get(u.dataId).values,{outVals:d,outShape:w,outDtype:h}=se(u.shape,u.dtype,m,f);let p=w;return r&&(p=Re(w,a)),g.forEach(I=>t.disposeIntermediateTensorInfo(I)),t.makeTensorInfo(p,h,d)}const Fs={kernelName:ye,backendName:"cpu",kernelFunc:Tn};/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Nn(n,e,t){n.forEach((s,o)=>{if(s<0||s>=t){const l=K(o,e.length,C(e)).join(",");throw new Error(`indices[${l}] = ${s} is not in [0, ${t})`)}})}function Mn(n,e){for(let t=0;t<n.length;++t){const s=n[t],o=t===n.length-1?e:n[t+1].length;if(s.length===0)throw new Error("Ragged splits may not be empty");if(s[0]<0)throw new Error("Ragged splits must be non-negative");if(s[s.length-1]>o)throw new Error("Ragged splits must not point past values");for(let l=1;l<s.length;++l)if(s[l-1]>s[l])throw new Error("Ragged splits must be sorted in ascending order")}}function Pn(n,e,t,s){const o=[];let l=0;const r=e.length-1+t.length,i=new Array(r).fill(null).map(()=>[0]);Mn(t,s);let a=1;for(let c=0;c<e.length-1;++c){a*=e[c];const f=e[c+1];for(let u=1;u<a+1;++u)i[c].push(u*f)}for(let c=0;c<n.length;++c){let f=n[c],u=n[c]+1;for(let g=0;g<t.length;++g){const m=t[g],d=g+e.length-1;if(d>=0){const w=i[d],h=w[w.length-1]-m[f];for(let p=f;p<u;++p)i[d].push(m[p+1]+h)}f=m[f],u=m[u]}u!==f&&(o.push([f,u]),l+=u-f)}return{outSplits:i,valueSlices:o,numValues:l}}function Cn(n){const e=[];for(let t=0;t<n.length;++t){const s=n[t].length,o=R("int32",s);e.push(o),n[t].forEach((l,r)=>o[r]=l)}return e}function ot(n,e){const t=n.slice(0,e);for(;t.length<e;)t.push(1);for(let s=e;s<n.length;s++)t[e-1]*=n[s];return t}function Fn(n,e,t,s,o,l){const r=ot(e,2)[1],i=ot(l,2)[1];let a=0;for(const c of t)for(let f=c[0];f<c[1];++f){for(let u=0;u<s;++u)o[a*i+u]=n[f*r+u];++a}}function Dn(n,e,t,s,o){const l=e.slice();l[0]=o;const r=R(t,S(l)),i=n.length,a=i===0?0:i/e[0];return Fn(n,e,s,a,r,l),[r,l]}function Vn(n,e,t,s,o,l,r,i){if(n.length===0)throw new Error("paramsNestedSplits must be non empty");if(e[0].length===0)throw new Error("Split tensors must not be scalars");const a=e[0][0]-1;if(Nn(l,r,a),s.length===0)throw new Error("params.rank must be nonzero");const c=s[0],{outSplits:f,valueSlices:u,numValues:g}=Pn(l,r,n,c),m=Cn(f),d=Dn(t,s,o,u,g);return[m,d[0],d[1]]}/**
 * @license
 * Copyright 2022 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const at=2147483647;function An(n,e,t,s,o,l,r){if(e.length>1)throw new Error("starts must be a scalar or vector");if(o.length>1)throw new Error("limits must be a scalar or vector");if(r.length>1)throw new Error("deltas must be a scalar or vector");const i=e.length===0,a=o.length===0,c=r.length===0,f=[];i||f.push(e[0]),a||f.push(o[0]),c||f.push(r[0]);for(let h=1;h<f.length;++h)if(f[h]!==f[h-1])throw new Error("starts, limits, and deltas must have the same shape");const u=f.length===0?1:f[0],g=R("int32",u+1);g[0]=0;for(let h=0;h<u;++h){const p=i?n[0]:n[h],I=a?s[0]:s[h],k=c?l[0]:l[h];if(k===0)throw new Error("Requires delta != 0");let x;if(k>0&&I<p||k<0&&I>p)x=0;else if(x=Math.ceil(Math.abs((I-p)/k)),x>at)throw new Error(`Requires ((limit - start) / delta) <= ${at}`);g[h+1]=g[h]+x}const m=g[u],d=R(t,m);let w=0;for(let h=0;h<u;++h){const p=g[h+1]-g[h];let I=i?n[0]:n[h];const k=c?l[0]:l[h];for(let x=0;x<p;++x)d[w++]=I,I+=k}return[g,d]}/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */var M=Ne;class _{constructor(e,t,s,o,l,r,i,a,c,f){this.shape=e,this.shapeShape=t,this.values=s,this.valuesShape=o,this.valuesDType=l,this.defaultValue=r,this.defaultValueShape=i,this.rowPartitionValues=a,this.rowPartitionValuesShapes=c,this.rowPartitionTypes=ve(f),this.raggedRank=Te(this.rowPartitionTypes)}getRowPartitionTypeByDimension(e){return this.rowPartitionTypes[0]===M.FIRST_DIM_SIZE?this.rowPartitionTypes[e+1]:this.rowPartitionTypes[e]}getRowPartitionTensor(e){return this.rowPartitionTypes[0]===M.FIRST_DIM_SIZE?this.rowPartitionValues[e+1]:this.rowPartitionValues[e]}getMaxWidth(e){const t=this.getRowPartitionTensor(e-1);switch(this.getRowPartitionTypeByDimension(e-1)){case M.VALUE_ROWIDS:return _.getMaxWidthValueRowID(t);case M.ROW_SPLITS:return _.getMaxWidthRowSplit(t);default:throw new Error(`Cannot handle partition type ${M[this.getRowPartitionTypeByDimension(e-1)]}`)}}static getMaxWidthRowSplit(e){const t=e.length;if(t===0||t===1)return 0;let s=0;for(let o=0;o<t-1;++o){const l=e[o+1]-e[o];l>s&&(s=l)}return s}static getMaxWidthValueRowID(e){const t=e.length;if(t===0)return 0;let s=0,o=e[0],l=0;for(let r=1;r<t;++r){const i=e[r];i!==o&&(o=i,l=Math.max(r-s,l),s=r)}return Math.max(t-s,l)}tensorShapeFromTensor(e,t,s=!0){if(t.length===0){if(e[0]===-1)return[];throw new Error("The only valid scalar shape tensor is the fully unknown shape specified as -1.")}return lt(e,s)}calculateOutputSize(e){const t=this.valuesShape,s=this.defaultValueShape;Me(s,t);const o=this.tensorShapeFromTensor(this.shape,this.shapeShape),r=Pe(this.raggedRank,o,t);r[0]<0&&(r[0]=e);for(let i=1;i<=this.raggedRank;++i)r[i]<0&&(r[i]=this.getMaxWidth(i));return r}calculateFirstParentOutputIndex(e,t,s){const o=Math.min(e,s),l=[];let r=0;for(let i=0;i<o;++i,r+=t)l.push(r);for(let i=o;i<e;++i)l.push(-1);return it(l.length===e,()=>"Final length of result must be equal to firstDimension."),l}calculateOutputIndexRowSplit(e,t,s,o){const l=e.length,r=[];for(let i=0;i<l-1;++i){const a=e[i+1]-e[i];let c=Math.min(o,a),f=t[i];f===-1&&(c=0);for(let u=0;u<c;++u)r.push(f),f+=s;for(let u=0;u<a-c;++u)r.push(-1)}if(l>0&&r.length!==e[l-1])throw new Error("Invalid row split size.");return r}calculateOutputIndexValueRowID(e,t,s,o){const l=e.length,r=[];if(l===0)return[];let i=0,a=e[0];if(a>=t.length)throw new Error(`Got currentValueRowId=${a}, which is not less than ${t.length}`);let c=t[a];r.push(c);for(let f=1;f<l;++f){const u=e[f];if(u===a)c>=0&&(++i,i<o?c+=s:c=-1);else{if(i=0,a=u,u>=t.length)throw new Error(`Got nextValueRowId=${u} which is not less than ${t.length}`);c=t[u]}r.push(c)}if(r.length!==e.length)throw new Error("Invalid row ids.");return r}calculateOutputIndex(e,t,s,o){const l=this.getRowPartitionTensor(e),r=this.getRowPartitionTypeByDimension(e);switch(r){case M.VALUE_ROWIDS:return this.calculateOutputIndexValueRowID(l,t,s,o);case M.ROW_SPLITS:if(l.length-1>t.length)throw new Error(`Row partition size is greater than output size: ${l.length-1} > ${t.length}`);return this.calculateOutputIndexRowSplit(l,t,s,o);default:throw new Error(`Unsupported partition type: ${M[r]}`)}}getFirstDimensionSize(){const e=this.rowPartitionValues[0];if(this.rowPartitionTypes.length===0)throw new Error("No row_partition_types given.");const t=this.rowPartitionTypes[0];switch(t){case M.FIRST_DIM_SIZE:return e[0];case M.VALUE_ROWIDS:throw new Error("Cannot handle VALUE_ROWIDS in first dimension.");case M.ROW_SPLITS:return this.rowPartitionValuesShapes[0][0]-1;default:throw new Error(`Cannot handle type ${M[t]}`)}}compute(){if(this.rowPartitionValues[0].length<=0)throw new Error("Invalid first partition input. Tensor requires at least one element.");const t=this.getFirstDimensionSize(),s=this.calculateOutputSize(t),o=new Array(this.raggedRank+1);o[o.length-1]=1;for(let a=o.length-2;a>=0;--a)o[a]=o[a+1]*s[a+1];const l=lt(s,!1),r=R(this.valuesDType,S(l));if(o[0]*s[0]>0){let a=this.calculateFirstParentOutputIndex(t,o[0],s[0]);for(let c=1;c<=this.raggedRank;++c)a=this.calculateOutputIndex(c-1,a,o[c],s[c]);this.setOutput(this.raggedRank,a,r,l)}return[l,r]}setOutput(e,t,s,o){if(s.length===0)return;const l=this.values,r=s;let i=o.slice();i=i.slice(e+1);const a=S(i),c=t.length;let f=this.defaultValue;if(f.length!==a&&f.length!==1){const d=this.defaultValueShape;Ce(()=>{const w=Fe(f,d);f=De(w,i).dataSync()})}let u=0,g=0,m=0;for(let d=0;d<=c;++d){let w=d<c?t[d]:-1;if(w===m){++m;continue}if(g<m){const h=l.subarray(u*a),p=r.subarray(g*a),I=(m-g)*a;rt(p,h,I)}if(d>=c){const h=s.length;w=Math.floor(h/a)}if(w>m)if(this.defaultValue.length===1)r.subarray(m*a,w*a).fill(this.defaultValue[0]),m=w;else for(;w>m;){const h=r.slice(m*a);rt(h,f,a),++m}w<0?(u=d+1,g=m):(u=d,g=m,m=g+1)}}}function rt(n,e,t){for(let s=0;s<t;s++)n[s]=e[s]}function lt(n,e){const t=[];for(let s of n){if(s<0){if(!e)throw new Error(`Dimension ${s} must be >= 0`);if(s<-1)throw new Error(`Dimension ${s} must be >= -1`);s=-1}t.push(s)}return t}function On(n,e,t,s,o,l,r,i,a,c){return new _(n,e,t,s,o,l,r,i,a,c).compute()}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function qn(n,e,t,s){const o=n===e,l=n<e&&t<0,r=e<n&&t>1;if(o||l||r)return O(0,s);const i=Math.abs(Math.ceil((e-n)/t)),a=O(i,s);e<n&&t===1&&(t=-1),a[0]=n;for(let c=1;c<a.length;c++)a[c]=a[c-1]+t;return a}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const oe=F(n=>1/Math.sqrt(n)),Ln=D(Nt,oe),Ds={kernelName:Nt,backendName:"cpu",kernelFunc:Ln};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function $n(n,e,t,s,o,l,r,i,a,c){const f=[s/o,o],u=n.values,g=e.values;if(s===0)return P(t,e.dtype);const m=a instanceof H?a:P(f,e.dtype);typeof a=="string"||typeof a=="number"?m.values.fill(a):typeof a=="boolean"&&m.values.fill(+a);for(let d=0;d<l;d++){const w=[];let h=0;for(let p=0;p<r;p++){const I=u[d*r+p];w.push(I),h+=I*i[p]}if(h<0||h>=s/o)throw new Error(`Invalid indices: ${w} does not index into ${t}`);for(let p=0;p<o;p++)c?m.values[h*o+p]+=g[d*o+p]:m.values[h*o+p]=e.rank===0?g[0]:g[d*o+p]}return m}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const zn=F(n=>1/(1+Math.exp(-n))),jn=$t(Mt,n=>1/(1+Math.exp(-n))),Vs={kernelName:Mt,backendName:"cpu",kernelFunc:jn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ae(n,e,t,s,o){const l=Ve(s,e,t),r=S(t),i=C(s);if(l){const u=Ae(e,i);return o==="string"?n.slice(u,u+r):n.subarray(u,u+r)}const a=o==="string"?j(n):n,c=P(s,o,a),f=P(t,o);for(let u=0;u<f.size;++u){const g=f.indexToLoc(u),m=g.map((d,w)=>d+e[w]);f.set(c.get(...m),...g)}return o==="string"?Oe(f.values):f.values}function Gn(n){const{inputs:e,backend:t,attrs:s}=n,{x:o}=e,{begin:l,size:r}=s;A(o,"slice");const[i,a]=Le(o,l,r);$e(o,i,a);const c=t.data.get(o.dataId).values,f=ae(c,i,a,o.shape,o.dtype);return t.makeTensorInfo(a,o.dtype,f)}const As={kernelName:qe,backendName:"cpu",kernelFunc:Gn};/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Wn(n,e,t,s,o,l,r){const i=e[0],a=l[0],c=new Array(a),f=new Array(i),u=e[1];if(a===0){if(i!==0)throw new Error(ze(i));const h=R(t,0),p=R(o,0);return[h,[0,u],p,c,f]}let g=!0,m=0;const d=new Array(a).fill(0);for(let h=0;h<i;++h){const p=n[h*u];if(p<0)throw new Error(je(h,p));if(p>=a)throw new Error(Ge(h,p,a));++d[p],g=g&&p>=m,m=p}let w=!0;for(let h=0;h<a;++h){const p=d[h]===0;c[h]=p,w=w&&!p,d[h]=Math.max(d[h],1),h>0&&(d[h]+=d[h-1])}if(w&&g){const h=n,p=s;for(let I=0;I<i;++I)f[I]=I;return[h,[i,u],p,c,f]}else{const h=d[a-1],p=R(t,h*u),I=R(o,h),k=new Array(a).fill(0);for(let x=0;x<i;++x){const b=n[x*u],y=k[b],E=(b===0?0:d[b-1])+y;k[b]++;for(let N=0;N<u;++N)p[E*u+N]=n[x*u+N];I[E]=s[x],f[x]=E}for(let x=0;x<a;++x)if(k[x]===0){const y=x===0?0:d[x-1];p[y*u+0]=x;for(let E=1;E<u;++E)p[y*u+E]=0;I[y]=r}return[p,[h,u],I,c,f]}}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Bn(n,e,t,s,o){const l=S(s),r=e[0],i=o.length,a=[];let c=1,f=-1;for(let h=0;h<i;++h){const p=o[h];if(p===-1){if(f!==-1)throw new Error(We(f,h));f=h,a.push(1)}else{if(p<0)throw new Error(Be(h,p));c*=p,a.push(p)}}if(f!==-1){if(c<=0)throw new Error(_e());const h=Math.trunc(l/c);if(c*h!==l)throw new Error(Ke(s,a));a[f]=h}if(S(a)!==l)throw new Error(Ue(s,a));const g=s.length,m=[];if(g>0){m[g-1]=1;for(let h=g-2;h>=0;--h)m[h]=m[h+1]*s[h+1]}const d=[];if(i>0){d[i-1]=1;for(let h=i-2;h>=0;--h)d[h]=d[h+1]*a[h+1]}const w=R(t,r*i);for(let h=0;h<r;++h){let p=0;for(let I=0;I<g;++I)p+=n[h*g+I]*m[I];for(let I=0;I<i;++I)w[h*i+I]=Math.trunc(p/d[I]),p%=d[I]}return[w,[r,i],a]}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function _n(n,e,t,s,o,l=!1,r=0){const i=s.length,a=[e[0],n.length/e[0]],c=a[1],u=i>0?o[i-1]+1:0;if(u<0)throw new Error(st());const g=e.slice();g[0]=u;const m=g.reduce((k,x)=>k*x,1),d=R(t,m);if(i===0)return u>0&&d.fill(r),[d,g];if(u<=0)throw new Error(st());let w=0,h=1,p=0,I=o[w];for(;;){let k=0;if(h<i){if(k=o[h],I===k){++h;continue}if(I>=k)throw new Error(Ze())}if(I<0||I>=u)throw new Error(Xe(I,u));I>p&&d.fill(r,p*c,I*c);for(let x=w;x<h;++x){const b=s[x];if(b<0||b>=a[0])throw new Error(He(x,s[x],a[0]));for(let y=0;y<c;y++)d[I*c+y]+=n[b*c+y]}if(l)for(let x=0;x<c;x++)d[I*c+x]/=h-w;if(w=h,++h,p=I+1,I=k,h>i)break}return p<u&&d.fill(r,p*c,u*c),[d,g]}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Kn=F(n=>Math.sqrt(n)),Un=$t(Pt,n=>Math.sqrt(n)),Os={kernelName:Pt,backendName:"cpu",kernelFunc:Un};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const re=v(((n,e)=>{const t=n-e;return t*t})),Zn=T(Ct,re),qs={kernelName:Ct,backendName:"cpu",kernelFunc:Zn};/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const le=F((n,e)=>{const{pattern:t,replaceGlobal:s,rewrite:o}=e;return n.replace(new RegExp(t,s?"g":""),o)}),Xn=D(Ft,le),Ls={kernelName:Ft,backendName:"cpu",kernelFunc:Xn};/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Hn(n,e,t,s){const o=P(n,e.dtype);for(let l=0;l<o.size;l++){const r=o.indexToLoc(l),i=new Array(r.length);for(let a=0;a<i.length;a++)i[a]=r[a]*t[a]+s[a];o.set(e.get(...i),...r)}return o}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Yn{constructor(e,t,s,o,l,r){this.separator=X(e),this.nGramWidths=t,this.leftPad=X(s),this.rightPad=X(o),this.padWidth=l,this.preserveShort=r}getPadWidth(e){return Math.min(this.padWidth<0?e-1:this.padWidth,e-1)}getNumNGrams(e,t){const s=this.getPadWidth(t);return Math.max(0,e+2*s-t+1)}createNGrams(e,t,s,o,l,r){for(let i=0;i<l;++i){const a=this.getPadWidth(r),c=Math.max(0,a-i),f=Math.max(0,a-(l-(i+1))),u=r-(c+f),g=t+(c>0?0:i-a);let m=0;m+=c*this.leftPad.length;for(let I=0;I<u;++I)m+=e[g+I].length;m+=f*this.rightPad.length;const d=c+f+u-1;m+=d*this.separator.length,s[o+i]=new Uint8Array(m);const w=s[o+i];let h=0;const p=I=>I.forEach(k=>w[h++]=k);for(let I=0;I<c;++I)p(this.leftPad),p(this.separator);for(let I=0;I<u-1;++I)p(e[g+I]),p(this.separator);if(u>0){p(e[g+u-1]);for(let I=0;I<f;++I)p(this.separator),p(this.rightPad)}else{for(let I=0;I<f-1;++I)p(this.rightPad),p(this.separator);p(this.rightPad)}}}compute(e,t){const s=e.length,o=t.length;if(o>0){let a=t[0];if(a!==0)throw new Error(`First split value must be 0, got ${a}`);for(let c=1;c<o;++c){let f=t[c]>=a;if(f=f&&t[c]<=s,!f)throw new Error(`Invalid split value ${t[c]}, must be in [${a}, ${s}]`);a=t[c]}if(a!==s)throw new Error(`Last split value must be data size. Expected ${s}, got ${a}`)}const l=o-1,r=R("int32",o);if(s===0||o===0){const a=new Array(s);for(let c=0;c<=l;++c)r[c]=0;return[a,r]}r[0]=0;for(let a=1;a<=l;++a){const c=t[a]-t[a-1];let f=0;this.nGramWidths.forEach(u=>{f+=this.getNumNGrams(c,u)}),this.preserveShort&&c>0&&f===0&&(f=1),r[a]=r[a-1]+f}const i=new Array(r[l]);for(let a=0;a<l;++a){const c=t[a];let f=r[a];if(this.nGramWidths.forEach(u=>{const g=t[a+1]-t[a],m=this.getNumNGrams(g,u);this.createNGrams(e,c,i,f,m,u),f+=m}),this.preserveShort&&f===r[a]){const u=t[a+1]-t[a];if(u===0)continue;const g=u+2*this.padWidth;this.createNGrams(e,c,i,f,1,g)}}return[i,r]}}function Qn(n,e,t,s,o,l,r,i){return new Yn(t,s,o,l,r,i).compute(n,e)}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Jn(n,e,t,s){if(!n.length)return;if(e.length===0){for(let l=0;l<n.length;++l)s.push(n.subarray(l,l+1));return}if(e.length===1){const l=e[0];let r=n.indexOf(l);for(;r!==-1;){const i=n.subarray(0,r);(!t||i.length!==0)&&s.push(i),n=n.subarray(r+1),r=n.indexOf(l)}(!t||n.length!==0)&&s.push(n);return}let o=0;for(let l=0;l<n.length+1;l++)if(l===n.length||e.indexOf(n[l])!==-1){const r=n.subarray(o,l);(!t||r.length!==0)&&s.push(r),o=l+1}}function ts(n,e,t){const s=n.length,o=[];let l=0,r=0;const i=new Array(s);for(let g=0;g<s;++g){const m=o.length;Jn(n[g],e,t,o);const d=o.length-m;i[g]=d,l+=d,r=Math.max(r,d)}const a=R("int32",l*2),c=new Array(l),f=[s,r];let u=0;for(let g=0;g<s;++g)for(let m=0;m<i[g];++m)a[u*2]=g,a[u*2+1]=m,c[u]=o[u],++u;return[a,c,f]}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function es(n,e){const t=R("int32",n.length);for(let s=0;s<n.length;++s)t[s]=Ye(n[s]).modulo(e).getLowBitsUnsigned();return t}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const ie=v(((n,e)=>n-e)),ns=J(((n,e,t,s)=>({real:n-t,imag:e-s}))),ss=T(Dt,ie,ns),$s={kernelName:Dt,backendName:"cpu",kernelFunc:ss};/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function os(n,e){const t=new Array(n.rank);for(let o=0;o<t.length;o++)t[o]=n.shape[o]*e[o];const s=P(t,n.dtype);for(let o=0;o<s.values.length;++o){const l=s.indexToLoc(o),r=new Array(n.rank);for(let a=0;a<r.length;a++)r[a]=l[a]%n.shape[a];const i=n.locToIndex(r);s.values[o]=n.values[i]}return s}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const $=(n,e)=>{const t=e.value-n.value;return t===0?n.index-e.index:t};function ce(n,e,t=0,s=n.length-1){for(;s>t;){if(s-t>600){const i=s-t+1,a=e-t+1,c=Math.log(i),f=.5*Math.exp(2*c/3),u=.5*Math.sqrt(c*f*(i-f)/i)*Math.sign(a-i/2),g=Math.max(t,Math.floor(e-a*f/i+u)),m=Math.min(s,Math.floor(e+(i-a)*f/i+u));ce(n,e,g,m)}const o=n[e];let l=t,r=s;for(L(n,t,e),$(n[s],o)>0&&L(n,t,s);l<r;){for(L(n,l,r),l++,r--;$(n[l],o)<0;)l=l+1;for(;$(n[r],o)>0;)r=r-1}$(n[t],o)===0?L(n,t,r):(r=r+1,L(n,r,s)),r<=e&&(t=r+1),e<=r&&(s=r-1)}}function as(n,e,t,s,o){const l=e[e.length-1],[r,i]=[n.length/l,l],a=V(t,r*s),c=V("int32",r*s);for(let u=0;u<r;u++){const g=u*i,m=n.subarray(g,g+i);let d=new Array(m.length);m.forEach((I,k)=>d[k]={value:I,index:k}),s<d.length&&(ce(d,s),d=d.slice(0,s)),o&&d.sort($);const w=u*s,h=a.subarray(w,w+s),p=c.subarray(w,w+s);for(let I=0;I<s;I++)h[I]=d[I].value,p[I]=d[I].index}const f=e.slice();return f[f.length-1]=s,[P(f,t,a),P(f,"int32",c)]}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function rs(n,e,t,s){const o=Tt(e,t)[0],l=[1,t[0],1];for(let d=0;d<o;d++)l[0]*=t[d];l[1]=t[o];for(let d=o+1;d<t.length;d++)l[2]*=t[d];const r=new Map,i=new Int32Array(t[o]),a=new H(l,s,n),c=[],f=l[0]===1&&l[2]===1;for(let d=0;d<t[o];d++){let w;if(f)w=n[d].toString();else{const p=[];for(let I=0;I<l[0];I++)for(let k=0;k<l[2];k++)p.push(a.get(I,d,k));w=p.join(",")}const h=r.get(w);if(h!=null)i[d]=h;else{const p=r.size;r.set(w,p),i[d]=p,c.push(d)}}const u=l.slice();u[1]=r.size;const g=new H(u,s);c.forEach((d,w)=>{for(let h=0;h<l[0];h++)for(let p=0;p<l[2];p++)g.set(a.get(h,d,p),h,w,p)});const m=t.slice();return m[o]=u[1],{outputValues:g.values,outputShape:m,indices:i}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const zs=Object.freeze(Object.defineProperty({__proto__:null,addImpl:qt,bincountImpl:en,bincountReduceImpl:nn,bitwiseAndImpl:Lt,castImpl:Ot,ceilImpl:zt,concatImpl:an,equalImpl:jt,expImpl:Gt,expm1Impl:Wt,floorDivImpl:_t,floorImpl:Bt,gatherNdImpl:hn,gatherV2Impl:dn,greaterEqualImpl:Ut,greaterImpl:Kt,lessEqualImpl:Xt,lessImpl:Zt,linSpaceImpl:wn,logImpl:Ht,maxImpl:kn,maximumImpl:Yt,minimumImpl:Qt,multiplyImpl:tt,negImpl:Jt,notEqualImpl:te,prodImpl:se,raggedGatherImpl:Vn,raggedRangeImpl:An,raggedTensorToTensorImpl:On,rangeImpl:qn,rsqrtImpl:oe,scatterImpl:$n,sigmoidImpl:zn,simpleAbsImpl:Vt,sliceImpl:ae,sparseFillEmptyRowsImpl:Wn,sparseReshapeImpl:Bn,sparseSegmentReductionImpl:_n,sqrtImpl:Kn,squaredDifferenceImpl:re,staticRegexReplaceImpl:le,stridedSliceImpl:Hn,stringNGramsImpl:Qn,stringSplitImpl:ts,stringToHashBucketFastImpl:es,subImpl:ie,tileImpl:os,topKImpl:as,transposeImpl:ee,uniqueImpl:rs},Symbol.toStringTag,{value:"Module"}));export{us as $,On as A,qn as B,$n as C,Wn as D,Bn as E,_n as F,Hn as G,Qn as H,ts as I,es as J,os as K,as as L,rs as M,rn as N,is as O,ds as P,ps as Q,hs as R,gs as S,cs as T,ms as U,Is as V,ws as W,xs as X,ks as Y,bs as Z,ys as _,A as a,Es as a0,Ss as a1,Rs as a2,vs as a3,Ts as a4,Ns as a5,Ms as a6,Ps as a7,Fs as a8,fs as a9,Ds as aa,Vs as ab,As as ac,Os as ad,qs as ae,Ls as af,$s as ag,Cs as ah,zs as ai,tn as b,v as c,T as d,Gn as e,en as f,U as g,an as h,Q as i,nn as j,G as k,ss as l,Sn as m,hn as n,dn as o,wn as p,ee as q,At as r,jn as s,ne as t,$t as u,kn as v,ln as w,Vn as x,An as y,Y as z};
