/**
 * Galaxy Wave 3 P2WSH vault candidates reconstructed from on-chain fingerprint
 * and cross-checked against the public COLDCARD RNG chain map (293 vaults).
 * Not Galaxy’s published address list — see WAVE3_FINGERPRINT in incident.ts.
 * Watch list: vaults ≥ 0.5 BTC only (78 · 184.97366201 BTC) for reliable snapshots.
 * Balances served from public/snapshot.json (cron), same as all other holdings.
 */

export const WAVE3_VAULTS = [
  {
    address: 'bc1qn3uy9j26m79vghed2uddr89l344xa5efnn4d0rxhz4q3xxlyxryqq595ld',
    label: 'Wave 3 vault 1',
    reportBtc: 20.49703196,
    pollBalance: false,
    note: 'Emptied Sep 2 (block 965217, ~5 sat/vB): first Wave 1–3 original vault spend — 2-of-2 P2WSH → hops → staging [bc1qgw8v0…](address:bc1qgw8v0fa7877ntrueghhz5tyc8lah8hm5phvsmu) → THORChain → ETH [0x160a7A4c…](https://etherscan.io/address/0x160a7A4c067B084F03400c6980Ac29F73F6782f6). ETH side (Sep 3): 317.16 ETH still sitting there (nonce 0) via 4 THORChain_Router (`0xD37BbE…`) internals — 12.88 + 45.80 + 31.58 + 226.90 ETH; no peel/Tornado yet. Galaxy: ~90% of Wave 3 still unmoved; BTC refunds/retries ongoing (~10.6 BTC on hop [bc1qt8rrtn…](address:bc1qt8rrtnxlszm7rcdjpeepzk076jd5hevakqerzjyxpk8u3p6dfh2q92ua36)). [Thorn](https://x.com/intangiblecoins/status/2095297452681158840).',
  },
  {
    address: 'bc1qu5dgcwgm0c6qazqhacskakt8qrqj96wfkyfzjsf2lje9unzjznasfmaygs',
    label: 'Wave 3 vault 2',
    reportBtc: 15.47824995,
  },
  {
    address: 'bc1qt7ktwfru52emkyyuw6nkju6lck98uxtc5r6gfwethgas50ufn22qpfsewn',
    label: 'Wave 3 vault 3',
    reportBtc: 12.26829462,
  },
  {
    address: 'bc1qh0kkrnegczjr39rw52fvutv4ur6kvtdnva3jf6tkwwy7hwwtl4uqm96ruj',
    label: 'Wave 3 vault 4',
    reportBtc: 9.74151747,
  },
  {
    address: 'bc1qajca7effwcxgpdf4aagh3h3fz634fnk93ar7c00hvghs3lrgk4tqd23qsa',
    label: 'Wave 3 vault 5',
    reportBtc: 6.88509195,
  },
  {
    address: 'bc1qysjc4jrltc4je2f9uek477xdczkrmkd0mwv2wgn47r0wt3qv4a7spkkx7h',
    label: 'Wave 3 vault 6',
    reportBtc: 5.39098601,
    note: '[Chainabuse victim](https://chainabuse.com/report/0f8d1d1c-556b-40e6-a819-c91c153497aa) · ~5.39 BTC Mk3 drain ([park](address:bc1q4626d9knltp3eeuwmfhuqh4ez3py4rdq9nsck8) → this vault).',
  },
  {
    address: 'bc1qtsp50w4uru6t2mhmctvapfdy23g75r08werm7qmgzuedm4jsaztspf73yt',
    label: 'Wave 3 vault 7',
    reportBtc: 4.53878769,
    note: '[Chainabuse victim](https://chainabuse.com/report/2727f906-bf8f-4540-92e4-ad4fd5b59cbf) · Mk3 drain ([park](address:bc1qz09phmghykhcglwhc58uf95mmjqq8vz4wmhz4v) → this vault).',
  },
  {
    address: 'bc1qmqc0vur7v0xcnvq2pzm2kxlmvw6twhlxtsvd8jgudjdwnud6juusx4nlwt',
    label: 'Wave 3 vault 8',
    reportBtc: 4.14175791,
  },
  {
    address: 'bc1qsev2de8syz3g9005q7ckkthak6jhz2y4gzjc8a7tfatdkx7y42sqdtwlwd',
    label: 'Wave 3 vault 9',
    reportBtc: 4.01383972,
  },
  {
    address: 'bc1qunepx2e5f65xa9cftcv6t6qcnwky77g9sl8k95zcty4jqwkxuurqs9ap78',
    label: 'Wave 3 vault 10',
    reportBtc: 3.98704957,
  },
  {
    address: 'bc1qcryst78hk4z75hsu5dyutlgnyw3g3grcwsenfvhpl3uvpf0m6paqqr0epc',
    label: 'Wave 3 vault 11',
    reportBtc: 3.80969146,
  },
  {
    address: 'bc1qfdps7y2239kh8vpm7c08ysgsx25a4e90ashpnyzsl9kq493ge4dqcgzcc4',
    label: 'Wave 3 vault 12',
    reportBtc: 3.63032005,
  },
  {
    address: 'bc1qvyzwwpf38jntuusr8x6nefqmafkdqe8h0m5k8zkh5nnte29h8sxqes4sp2',
    label: 'Wave 3 vault 13',
    reportBtc: 3.39235311,
  },
  {
    address: 'bc1qg4qf5dqsry4wrhdp3wcf9eml6m0gy53c6nfxkg3wnyj7j36nefds7kkxcf',
    label: 'Wave 3 vault 14',
    reportBtc: 3.31668005,
  },
  {
    address: 'bc1qrw2njsqq5hv77wx7dnrff6la86tefqndv5rnwkmzh2g8qplp7vjq7acn5e',
    label: 'Wave 3 vault 15',
    reportBtc: 3.2672638,
  },
  {
    address: 'bc1qhm7vwpzaj9ahhhcmcxmsgqlj6tct84qupwdqe77djznvqrc9ksxqsxflvy',
    label: 'Wave 3 vault 16',
    reportBtc: 3.00585628,
  },
  {
    address: 'bc1qunseds6wr6q6qux972jfrl7fckfehcp0ldanhryvmvtw93w0ekzq0rwsnx',
    label: 'Wave 3 vault 17',
    reportBtc: 2.99922036,
  },
  {
    address: 'bc1qyqjwt8gc5jcveknknvdjzjvk5u5zcy0hkaznwxt69x5kyxueqztsm5a848',
    label: 'Wave 3 vault 18',
    reportBtc: 2.92126799,
  },
  {
    address: 'bc1qhx7w9u2ahwmq2gtkepgtl9urlkfjn6zqdqr5sjzjvs7z8z8r4ytqgwadeu',
    label: 'Wave 3 vault 19',
    reportBtc: 2.8116249,
  },
  {
    address: 'bc1qe68n9fruk29e9kgps0rf55mjpts0u2sgzq7nxamd0hppnpky8fas7226a5',
    label: 'Wave 3 vault 20',
    reportBtc: 2.73894035,
  },
  {
    address: 'bc1qy76lxfn55t7xk5xurvyt6u564fug9g8j3q5mf8j4cddesdn27l5sasslyf',
    label: 'Wave 3 vault 21',
    reportBtc: 2.72482097,
  },
  {
    address: 'bc1q7qu3wyh6vz40j03x4s7vyeh29t08tfc3gm9mckuqq27yg7zlmsrq0qacp4',
    label: 'Wave 3 vault 22',
    reportBtc: 2.6494159,
  },
  {
    address: 'bc1qe7lwuc3vjzmf3rgvh9sc7y8sxmej7vr8pcsyae7me7vr7hu8qfeqvxafaj',
    label: 'Wave 3 vault 23',
    reportBtc: 2.52064635,
  },
  {
    address: 'bc1qw3mqlq88es7046e366hmledrydd5aqz5kpw57hq3fxutmctl7m3swxyhph',
    label: 'Wave 3 vault 24',
    reportBtc: 2.50784278,
  },
  {
    address: 'bc1q48yxfmeckk5r0nkzkjw83xyhtvhl7jhfmkzdpxuqy3yg7nd4k4qsu4r4zn',
    label: 'Wave 3 vault 25',
    reportBtc: 2.20411992,
  },
  {
    address: 'bc1q4jg9dq0twcm23ee7e4etghm5y67h6tc59t95eklg8remnryamqtq7pmdnh',
    label: 'Wave 3 vault 26',
    reportBtc: 2.18639261,
  },
  {
    address: 'bc1qvlaxcmgnqyej6g0j79fzgga6s4za54yqyxzdfgv2cvazzn83kp6s9kqr94',
    label: 'Wave 3 vault 27',
    reportBtc: 2.08421608,
  },
  {
    address: 'bc1qmfyggrvay30lfrn0743f0g4v20agl2gvkmcaycxd5tf6nh5nxfgqlq084x',
    label: 'Wave 3 vault 28',
    reportBtc: 2.05746782,
  },
  {
    address: 'bc1qr4jfp7f5cmrtrl2gxsrujyec60gq3x54p4u08n8xgslkvww787nq4ylgjt',
    label: 'Wave 3 vault 29',
    reportBtc: 2.02848692,
  },
  {
    address: 'bc1q4x7ydyupwz26ytwwykrnh0dd8my343cmlzwfhfcdy9c80qsdztzqurffxu',
    label: 'Wave 3 vault 30',
    reportBtc: 1.73373065,
  },
  {
    address: 'bc1qkz22xld4ayh0gcvsdc43v9yuylzczhhasqsts8swq3clck0mrgzqulkacd',
    label: 'Wave 3 vault 31',
    reportBtc: 1.69188357,
  },
  {
    address: 'bc1qmhhm9s0mwq53jskqfywgpza6pqqugzax4twpdnsdd0jxv56dh8rqm58kkh',
    label: 'Wave 3 vault 32',
    reportBtc: 1.68228991,
  },
  {
    address: 'bc1qkaqcswmepnauaxnczf5waxuer3zqce2tsjcl99dnyeywfpcxmq0q9j8lch',
    label: 'Wave 3 vault 33',
    reportBtc: 1.58669331,
  },
  {
    address: 'bc1qxkpyzkx5pewn8gjqwvw979hpc3ufsqugm5c540xeeq4ue0s6yuestkfqla',
    label: 'Wave 3 vault 34',
    reportBtc: 1.51069414,
  },
  {
    address: 'bc1qj3jd8yakc2h3kta302h0nfn959aeqdyd987atyaquk0z6ulje2rqj5v27w',
    label: 'Wave 3 vault 35',
    reportBtc: 1.42355164,
  },
  {
    address: 'bc1qxuva8whfr2x49puaq09lv20ucla7ar5zfpx4a7ujmw69hawvd0esuddrs5',
    label: 'Wave 3 vault 36',
    reportBtc: 1.2984018,
  },
  {
    address: 'bc1q3jnv88p33tq48z5dyctmau6cws7lzfrepehc7duezxt6j7n98jxs0yqva7',
    label: 'Wave 3 vault 37',
    reportBtc: 1.29341473,
  },
  {
    address: 'bc1q2q8epfccrc9aynv7uz7z7j93rnz5gwuz8le6zhd0t386d3etcpxs6h0lm2',
    label: 'Wave 3 vault 38',
    reportBtc: 1.24272696,
  },
  {
    address: 'bc1qtwx5m06dmxt5as7ulpkuq5kd345q3teauwu833mkf5s7jft4nl9qjfyxru',
    label: 'Wave 3 vault 39',
    reportBtc: 1.14238463,
  },
  {
    address: 'bc1qfgv6pyhs6y2cs0rzc5cuadsdzjju6ae0t7qwvdle3zy5vmf02ynqs4h9ae',
    label: 'Wave 3 vault 40',
    reportBtc: 1.10389012,
  },
  {
    address: 'bc1qwy642mr3u4gwl3zwzxd6p7l3m33a0mhp6xdj27y83dqsrw7xxvcq65xj4s',
    label: 'Wave 3 vault 41',
    reportBtc: 1.05327357,
  },
  {
    address: 'bc1qtu8suvhp2zp994fnawvrmuvh5k263waap3kmwluzacfsdv4x9grs4eg09u',
    label: 'Wave 3 vault 42',
    reportBtc: 1.0430298,
  },
  {
    address: 'bc1qcu3w05j0n7s3q7nlwn0apsfnyapxd7r3xj2rrny0ffnkfxmpuafqetphx4',
    label: 'Wave 3 vault 43',
    reportBtc: 1.01976357,
  },
  {
    address: 'bc1q3ehq9tz6zz9xur969exg2rnpsqge6uf9vqanz3v856knnz5w2e9sa5yh8j',
    label: 'Wave 3 vault 44',
    reportBtc: 1.01857988,
  },
  {
    address: 'bc1qqu0sp6d4wxnp33ghgrtexrczzzl85f3vnlueep2hlsw69t38xazqltw5ac',
    label: 'Wave 3 vault 45',
    reportBtc: 1.01266757,
  },
  {
    address: 'bc1qsjltn7mjlkl3fuxdexdnjjyzp9fxcvzxn92upxa0764nfxl7a6eqzc0szd',
    label: 'Wave 3 vault 46',
    reportBtc: 1.0069355,
  },
  {
    address: 'bc1qtl628t8mfce0sgfxpkt5csu2uw4jema7ekz5gj2atsvktyzwur2qwh9r2j',
    label: 'Wave 3 vault 47',
    reportBtc: 1.00093255,
  },
  {
    address: 'bc1qa3mfkwwdsa2xa6xsazp5yd2cr5e3tyf7j0mgax7xzumpj4gtz77sdzd64z',
    label: 'Wave 3 vault 48',
    reportBtc: 1.00040325,
  },
  {
    address: 'bc1q5c6m8qrqum6xhlyaw9yplggak4vlz6p9kj8szcphh2x0jvfa3heq5mgfa2',
    label: 'Wave 3 vault 49',
    reportBtc: 1.0001318,
  },
  {
    address: 'bc1qt2k74x6s8wdtvqwmdnhdzm4k7dvueprh3e0hvs9q68w0eq6xm49s3kf758',
    label: 'Wave 3 vault 50',
    reportBtc: 0.9949898,
  },
  {
    address: 'bc1q7fgsarhqap7kzhpy2efj5d5fha735jne2e225g9dzn244f3je84smsv9fj',
    label: 'Wave 3 vault 51',
    reportBtc: 0.9934878,
  },
  {
    address: 'bc1qrx4r4dgfhtfn3ekumz6f53m7s9y5wch985fa0zxznz6hnm6vt9sqkutf0n',
    label: 'Wave 3 vault 52',
    reportBtc: 0.85192202,
  },
  {
    address: 'bc1q464uswwg3sq3c00wc8wqhlhqpl0samckyggnzhlk3rjl38nhr6ssslhtk0',
    label: 'Wave 3 vault 53',
    reportBtc: 0.85074447,
  },
  {
    address: 'bc1qkl4vkxz7ax3zkwz6awq4pv2xuznjzqrs4ve4h957zrvpy8jfyvsshglgc2',
    label: 'Wave 3 vault 54',
    reportBtc: 0.83717676,
  },
  {
    address: 'bc1q893u2894gx3ctxdl4hfn78ya60zzqndfpsucm02q7d0wf7l6rdvq2p64rx',
    label: 'Wave 3 vault 55',
    reportBtc: 0.8353508,
  },
  {
    address: 'bc1q75t6kucn702r8fmg5wt7xq3pgvw0lkua2p5a6wv2f2nlrmhlu44que6rl2',
    label: 'Wave 3 vault 56',
    reportBtc: 0.81458411,
  },
  {
    address: 'bc1qc5j2jgp0mgrxsmq79gq5yv0gavyuxfd3z3plss4mcrvnq0239zeq822mln',
    label: 'Wave 3 vault 57',
    reportBtc: 0.80094372,
  },
  {
    address: 'bc1qnjpfhc4pdmxmp2tzjz45u22anttwtk4u0lty5x2k7qwcsjm0hn2sa8tqc5',
    label: 'Wave 3 vault 58',
    reportBtc: 0.77812263,
  },
  {
    address: 'bc1q64nmnz88qe0ee0e3a3ne4mnelvajz8dq5zcf8mqvslqcx72hdtzqsu2td0',
    label: 'Wave 3 vault 59',
    reportBtc: 0.77291101,
  },
  {
    address: 'bc1qassuukkcmngzuvg3crswanmsnr08pjnunvc24f7r2p0zjnj35sushh93zs',
    label: 'Wave 3 vault 60',
    reportBtc: 0.7596758,
  },
  {
    address: 'bc1qxhju5xspcy8vu9ey4fve548wycm6nhq3vrvp902e0xsm0cz7l8zqh2snjc',
    label: 'Wave 3 vault 61',
    reportBtc: 0.75536701,
  },
  {
    address: 'bc1qq2y3q0c4ulhe9c00pmxmhxkdcsuc0pf93krhcmqk3cy7nkjkc6vqgjpzkl',
    label: 'Wave 3 vault 62',
    reportBtc: 0.70431447,
  },
  {
    address: 'bc1q22envza50tlwrdegd9uf86k98jccjc4uxh6te7lyapxnkx05q6nq5knnwx',
    label: 'Wave 3 vault 63',
    reportBtc: 0.70394873,
  },
  {
    address: 'bc1q6vc45ulxcyra499strhwrrppcnqk6s40wrn4frl4dpx5wansl0cs9yklv7',
    label: 'Wave 3 vault 64',
    reportBtc: 0.69906337,
  },
  {
    address: 'bc1qrmp5a6xdve2k9kun5g22y09gdwnmd3e6npxt0s2t7nzxrnv9uufs7z8w8m',
    label: 'Wave 3 vault 65',
    reportBtc: 0.67899409,
  },
  {
    address: 'bc1qu673mdghv3e8sctx7vmjv5uzrgz9khzw4q7nefuu3uhmsehst5sqhz5ztq',
    label: 'Wave 3 vault 66',
    reportBtc: 0.66510239,
  },
  {
    address: 'bc1qhvrd93pj6zh5qt23g79v3c06j7weuyljsjkc8klr7sqgkncgpkksptvlfn',
    label: 'Wave 3 vault 67',
    reportBtc: 0.64598208,
  },
  {
    address: 'bc1q0pyh8m970h2gsv8l8l58alk02qt6q9hnzf6mh4r3rurqkhvdllns3m6nkf',
    label: 'Wave 3 vault 68',
    reportBtc: 0.61847292,
  },
  {
    address: 'bc1q5k77u9n2c5tp7mg3pwauyhcju0c2sytfem84rpqwj5par392qwvslddty4',
    label: 'Wave 3 vault 69',
    reportBtc: 0.5941699,
  },
  {
    address: 'bc1qmkqkq6c7nj9ahrldajdktwgnkw98yxcn6rvq0p4ude8a3lrc4p2ql4mgyu',
    label: 'Wave 3 vault 70',
    reportBtc: 0.58741437,
  },
  {
    address: 'bc1qwymjp76jw6m2qyctynwfpy37cdwcdryhamclg2vdvucgheql09as3u33zw',
    label: 'Wave 3 vault 71',
    reportBtc: 0.58633145,
  },
  {
    address: 'bc1qm2de6c09vajzztvxzv8tzn2a7rj68sx4zjcaczunh6s34yh0fyvqmnq34p',
    label: 'Wave 3 vault 72',
    reportBtc: 0.5808048,
  },
  {
    address: 'bc1qcwcxxpnpryvhe42z3dweecdwfyvxgklwus654ta6ks3tlqfrfdus5g6ygk',
    label: 'Wave 3 vault 73',
    reportBtc: 0.55392397,
  },
  {
    address: 'bc1q6vpkjwgv88w53v03axsd6k0jjr8zjv9mrt5swgda9k45qh75764s37udc6',
    label: 'Wave 3 vault 74',
    reportBtc: 0.54963327,
  },
  {
    address: 'bc1qtujm6ufvvnmemtjyulmhgq9cky7ww92yc2t0ye8t2kyd6eu563vqwpqs6r',
    label: 'Wave 3 vault 75',
    reportBtc: 0.54569989,
  },
  {
    address: 'bc1qfeg6uqsv7rt59yp3fs44x8wunre5vpgum7shkejwxz86hvn3c9uqa58my8',
    label: 'Wave 3 vault 76',
    reportBtc: 0.54132885,
  },
  {
    address: 'bc1qkwhtguuqpdlr2zjq7nf87etgs9f3y98qy6epvgk6kl7xe02msntst8n5zl',
    label: 'Wave 3 vault 77',
    reportBtc: 0.5069498,
  },
  {
    address: 'bc1qkyncy6suewl4gs7ptvwggvvdwtt70u68rey7yw2ymyuxcpwxagmssw293h',
    label: 'Wave 3 vault 78',
    reportBtc: 0.50163823,
  },
] as const;

export const WAVE3_VAULT_COUNT = 78 as const;
export const WAVE3_VAULT_REPORT_BTC = 184.97366201;
/** Only watch Wave 3 vaults at or above this report balance (BTC). */
export const WAVE3_MIN_WATCH_BTC = 0.5;
