const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const uidInput = ref('8833235');
    const card = ref({});
    const draft = ref({});
    const loading = ref(false);
    const saving = ref(false);
    const message = ref('');
    const isError = ref(false);
    const flipped = ref(false);
    const tab = ref('pets');
    const editorOpen = ref(false);
    const displayPets = computed(() => [...(card.value.pets || []), {}, {}, {}, {}, {}, {}].slice(0, 6));

    function notify(text, error = false) { message.value = text; isError.value = error; window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => { message.value = ''; }, 3500); }
    async function loadCard() {
      loading.value = true; message.value = '';
      try {
        const response = await fetch(`/api/fetch-card`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: uidInput.value }) });
        if (response.ok) {
          const remote = await response.json();
          card.value = normalizeRemote(remote, uidInput.value);
          notify('已从 RoCom 接口加载名片');
        } else {
          const local = await fetch(`/api/cards/${uidInput.value}`);
          card.value = await local.json();
          notify('接口不可用，已加载本地 JSON 数据');
        }
      } catch (error) {
        const local = await fetch(`/api/cards/${uidInput.value}`);
        card.value = await local.json();
        notify('已加载本地保存的数据', false);
      } finally { loading.value = false; }
    }
    function normalizeRemote(data, uid) {
      const rows = Object.fromEntries((data.rows || []).map(row => [row.field, row.value]));
      const info = data.player_card_brief_info || {};
      return { ...card.value, uid, name: rows['player_card_brief_info.player_name'] || card.value.name || '洛克玩家', sign: rows['player_card_brief_info.signature'] || card.value.sign, cardImage: rows['player_card_brief_info.business_card_info.cur_card_url'] || card.value.cardImage, handbook: rows['player_card_brief_info.card_handbook_collect_num'] || 0, bond: rows['player_card_brief_info.card_fashion_bond_collect_num'] || 0, topicPoint: rows.topic_point || 0, shining: rows['player_card_brief_info.card_pet_info.collected_shining_pet_count'] || 0, glass: rows['player_card_brief_info.card_pet_info.collected_glass_pet_count'] || 0, pets: (info.card_collect_info?.card_module_pet_infos || []).slice(0, 6).map(pet => ({ name: `ID:${pet.pet_base_id}`, image: `https://wegame.shallow.ink/api/v1/resources/rocom/pet/${pet.pet_base_id}` })) };
    }
    async function saveCard() {
      saving.value = true;
      try {
        const response = await fetch(`/api/cards/${card.value.uid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft.value) });
        if (!response.ok) throw new Error('save failed');
        card.value = await response.json(); editorOpen.value = false; notify('名片已保存到 data/cards.json');
      } catch (error) { notify('保存失败，请确认 Node 服务正在运行', true); } finally { saving.value = false; }
    }
    function openEditor() { draft.value = { name: card.value.name, sign: card.value.sign, title: card.value.title }; editorOpen.value = true; }
    async function copyUid() { await navigator.clipboard.writeText(String(card.value.uid)); notify('UID 已复制'); }
    onMounted(loadCard);
    return { uidInput, card, draft, loading, saving, message, isError, flipped, tab, editorOpen, displayPets, loadCard, saveCard, openEditor, copyUid };
  }
}).mount('#app');
