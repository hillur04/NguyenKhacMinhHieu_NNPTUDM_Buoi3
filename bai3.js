
const API_URL = 'https://api.escuelajs.co/api/v1/products';

function escapeHtml(s){ if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.addEventListener('DOMContentLoaded', ()=>{
    const tbody = document.getElementById('product-tbody');
    const searchInput = document.getElementById('searchInput');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const pagination = document.getElementById('pagination');
    const sortTitleBtn = document.getElementById('sortTitle');
    const sortPriceBtn = document.getElementById('sortPrice');
    const exportCsvBtn = document.getElementById('exportCsv');
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    const editToggle = document.getElementById('editToggle');
    const saveDetail = document.getElementById('saveDetail');
    let products = [];
    let filtered = [];
    let currentPage = 1;
    let pageSize = 10;
    let sortState = { field: null, dir: 1 };
    let editMode = false;

    async function fetchProducts(){
        try{
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Network response was not ok');
            products = await res.json();
            currentPage = 1;
            applyFiltersAndRender();
        }catch(err){
            console.error('Fetch products failed', err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Failed to load products</td></tr>`;
        }
    }

    function applyFiltersAndRender(){
        const q = (searchInput.value || '').trim().toLowerCase();
        filtered = products.filter(p => (p.title||'').toLowerCase().includes(q));
        
        // Apply sorting
        if (sortState.field){
            filtered.sort((a, b)=>{
                let A = sortState.field === 'title' ? (a.title||'').toLowerCase() : (a.price||0);
                let B = sortState.field === 'title' ? (b.title||'').toLowerCase() : (b.price||0);
                if (A < B) return -1 * sortState.dir;
                if (A > B) return 1 * sortState.dir;
                return 0;
            });
        }
        
        currentPage = 1;
        renderTable();
        renderPagination();
    }

    function renderTable(){
        tbody.innerHTML = '';
        if (!filtered || filtered.length === 0){
            tbody.innerHTML = '<tr><td colspan="5">No products</td></tr>';
            return;
        }

        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = filtered.slice(start, end);

        pageItems.forEach(p=>{
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.setAttribute('data-bs-toggle','tooltip');
            tr.setAttribute('title', 'mô tả: ' + (p.description || ''));

            const imgCell = (p.images && p.images.length) ? `<img src="${escapeHtml(p.images[0])}" class="thumb" alt="img"/>` : '';
            const category = p.category && p.category.name ? escapeHtml(p.category.name) : (p.category || '');

            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${escapeHtml(p.title)}</td>
                <td>${p.price}</td>
                <td><span class="badge-category">${category}</span></td>
                <td>${imgCell}</td>
            `;

            // Click to open detail modal
            tr.addEventListener('click', ()=> openDetailModal(p));

            tbody.appendChild(tr);
        });

        // initialize bootstrap tooltips for descriptions
        const ttList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        ttList.forEach(el => { try{ new bootstrap.Tooltip(el); }catch(e){} });
    }

    function renderPagination(){
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filtered.length / pageSize) || 1;
        for (let i = 1; i <= totalPages; i++){
            const li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', (e)=>{
                e.preventDefault();
                currentPage = i;
                renderTable();
                renderPagination();
            });
            pagination.appendChild(li);
        }
    }

    // live search by title — updates view as user types
    if (searchInput){
        searchInput.addEventListener('input', ()=>{
            applyFiltersAndRender();
        });
    }

    // page size change
    if (pageSizeSelect){
        pageSizeSelect.addEventListener('change', ()=>{
            pageSize = Number(pageSizeSelect.value);
            applyFiltersAndRender();
        });
    }

    // sorting handlers
    if (sortTitleBtn){
        sortTitleBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            if (sortState.field === 'title') sortState.dir *= -1; 
            else { sortState.field = 'title'; sortState.dir = 1; }
            applyFiltersAndRender();
        });
    }

    if (sortPriceBtn){
        sortPriceBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            if (sortState.field === 'price') sortState.dir *= -1; 
            else { sortState.field = 'price'; sortState.dir = -1; }
            applyFiltersAndRender();
        });
    }

    // export CSV of current view
    function toCSV(items){
        const headers = ['ID','Title','Price','Category','Images','Description'];
        const rows = items.map(p=>[
            p.id,
            `"${(p.title||'').replace(/"/g,'""')}"`,
            p.price,
            `"${(p.category?.name||p.category||'').replace(/"/g,'""')}"`,
            `"${(p.images||[]).join('|').replace(/"/g,'""')}"`,
            `"${(p.description||'').replace(/"/g,'""')}"`
        ].join(','));
        return headers.join(',') + '\n' + rows.join('\n');
    }

    function downloadCsv(filename, csv){
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (exportCsvBtn){
        exportCsvBtn.addEventListener('click', ()=>{
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const pageItems = filtered.slice(start, end);
            const csv = toCSV(pageItems);
            downloadCsv(`products_page_${currentPage}.csv`, csv);
        });
    }

    // Detail modal handlers
    function openDetailModal(product){
        editMode = false;
        document.getElementById('detailId').value = product.id;
        document.getElementById('detailIdDisplay').value = product.id;
        document.getElementById('detailTitle').value = product.title || '';
        document.getElementById('detailPrice').value = product.price || '';
        document.getElementById('detailCategoryId').value = product.category?.id || '';
        document.getElementById('detailDescription').value = product.description || '';
        
        // images input (comma separated) and preview
        const imagesInput = document.getElementById('detailImagesInput');
        const preview = document.getElementById('detailImagesPreview');
        imagesInput.value = (product.images || []).join(', ');
        preview.innerHTML = '';
        if (product.images && product.images.length){
            product.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img;
                imgEl.style.cssText = 'width:80px;height:80px;margin-right:8px;border-radius:6px;object-fit:cover';
                preview.appendChild(imgEl);
            });
        }
        
        setDetailReadonly(true);
        saveDetail.style.display = 'none';
        // ensure edit button shows correct label when opening a product
        if (editToggle) editToggle.textContent = '✏️ Edit';
        detailModal.show();
    }

    function setDetailReadonly(readonly){
        document.getElementById('detailTitle').readOnly = readonly;
        document.getElementById('detailPrice').readOnly = readonly;
        document.getElementById('detailCategoryId').readOnly = readonly;
        document.getElementById('detailDescription').readOnly = readonly;
        document.getElementById('detailImagesInput').readOnly = readonly;
    }

    editToggle.addEventListener('click', ()=>{
        editMode = !editMode;
        setDetailReadonly(!editMode);
        saveDetail.style.display = editMode ? 'inline-block' : 'none';
        editToggle.textContent = editMode ? '✖️ Cancel' : '✏️ Edit';
    });

    saveDetail.addEventListener('click', async ()=>{
        const id = document.getElementById('detailId').value;
        const imagesRaw = document.getElementById('detailImagesInput').value || '';
        const imagesArr = imagesRaw.split(',').map(s=>s.trim()).filter(Boolean);
        const payload = {
            title: document.getElementById('detailTitle').value,
            price: Number(document.getElementById('detailPrice').value),
            description: document.getElementById('detailDescription').value,
            categoryId: Number(document.getElementById('detailCategoryId').value) || 1,
            images: imagesArr
        };
        try{
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const responseText = await res.text();
            console.log('Update response status:', res.status);
            console.log('Update response body:', responseText);
            
            if (!res.ok){
                throw new Error(`HTTP ${res.status}: ${responseText}`);
            }
            
            const updated = JSON.parse(responseText);
            
            // Update local products array
            const idx = products.findIndex(p => p.id == id);
            if (idx >= 0){
                products[idx] = { ...products[idx], ...updated };
            }
            
            applyFiltersAndRender();
            detailModal.hide();
            editMode = false;
            if (editToggle) editToggle.textContent = '✏️ Edit';
            alert('Updated successfully!');
        }catch(err){
            console.error('Update error:', err);
            alert('Update failed: ' + err.message);
        }
    });

    fetchProducts();

    // Reset edit state when modal is closed to avoid stale UI state
    const detailModalEl = document.getElementById('detailModal');
    if (detailModalEl){
        detailModalEl.addEventListener('hidden.bs.modal', ()=>{
            editMode = false;
            setDetailReadonly(true);
            saveDetail.style.display = 'none';
            if (editToggle) editToggle.textContent = '✏️ Edit';
        });
    }

    // Create modal (rewritten)
    const createModalNewEl = document.getElementById('createModalNew');
    const createModalNew = createModalNewEl ? new bootstrap.Modal(createModalNewEl) : null;
    const newCreateSubmit = document.getElementById('newCreateSubmit');
    const newCreateImageInput = document.getElementById('newCreateImage');
    const newCreateError = document.getElementById('newCreateError');

    function prepareNewCreate(){
        // compute max id + 1
        let maxId = 0;
        products.forEach(p=>{ if (p && p.id && Number(p.id) > maxId) maxId = Number(p.id); });
        const newId = maxId + 1;
        document.getElementById('newCreateIdDisplay').value = newId;
        document.getElementById('newCreateTitle').value = '';
        document.getElementById('newCreateImage').value = '';
        document.getElementById('newCreateImagePreview').innerHTML = '';
        document.getElementById('newCreateCategoryId').value = '';
        document.getElementById('newCreateDescription').value = '';
        document.getElementById('newCreatePrice').value = '';
        if (newCreateError){ newCreateError.style.display = 'none'; newCreateError.innerText = ''; }
    }

    if (createModalNewEl){
        createModalNewEl.addEventListener('show.bs.modal', ()=>{
            prepareNewCreate();
        });
    }

    if (newCreateImageInput){
        newCreateImageInput.addEventListener('input', ()=>{
            const url = (newCreateImageInput.value || '').trim();
            const prev = document.getElementById('newCreateImagePreview');
            prev.innerHTML = '';
            if (url){
                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = 'width:100px;height:100px;object-fit:cover;border-radius:6px';
                prev.appendChild(img);
            }
        });
    }

    if (newCreateSubmit){
        newCreateSubmit.addEventListener('click', async ()=>{
            const id = Number(document.getElementById('newCreateIdDisplay').value);
            const title = (document.getElementById('newCreateTitle').value || '').trim();
            const image = (document.getElementById('newCreateImage').value || '').trim();
            const categoryId = Number(document.getElementById('newCreateCategoryId').value) || 1;
            const description = (document.getElementById('newCreateDescription').value || '').trim();
            const price = Number(document.getElementById('newCreatePrice').value) || 0;
            if (!title){ if (newCreateError){ newCreateError.style.display='block'; newCreateError.className='alert alert-danger'; newCreateError.innerText='Title is required'; } else alert('Title is required'); return; }
            const payload = { id, title, price, description, categoryId, images: image ? [image] : [] };
            try{
                const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const text = await res.text();
                console.log('Create response status:', res.status);
                console.log('Create response body:', text);
                if (!res.ok){ let msg = text; try{ const j = JSON.parse(text); msg = j.message || JSON.stringify(j); }catch(e){} if (newCreateError){ newCreateError.style.display='block'; newCreateError.className='alert alert-danger'; newCreateError.innerText = `Create failed: HTTP ${res.status} — ${msg}`; } throw new Error(`HTTP ${res.status}: ${msg}`); }
                const created = JSON.parse(text);
                // if API doesn't return the same id, ensure local object has id
                if (!created.id) created.id = id;
                products.unshift(created);
                applyFiltersAndRender();
                if (createModalNew) createModalNew.hide();
                alert('Created successfully!');
            }catch(err){ console.error('Create error:', err); if (!newCreateError) alert('Create failed: '+err.message); }
        });
    }

});
