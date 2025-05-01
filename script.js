const editor = document.getElementById('editor')
const form = document.getElementById('caretManager')
const inputs = form.querySelectorAll('input')

const inputMethod = inputs[0]
const inputNode = inputs[1]
const inputOffset = inputs[2]

const datalistEl = document.getElementById('node-list')
const datalistText = document.getElementById('nodeText-list')

// Ajuste la largeur d’un input selon son contenu ou placeholder
function resizeInput(input) {
    const valLen = input.value.length
    const placeholderLen = input.placeholder?.length || 0
    input.style.width = (valLen ? valLen : placeholderLen) + 0.5 + 'ch'
}

// Réagit à chaque modification d’input
inputs.forEach(input => {
    resizeInput(input)
    input.addEventListener('input', () => {
        resizeInput(input)
        playInput()
    })
})

function updateDatalists() {
    const nodes = collectNodes(editor)
    datalistEl.innerHTML = ''
    datalistText.innerHTML = ''
    window.availableNodes = nodes

    for (const { label, type } of nodes) {
        const opt = document.createElement('option')
        opt.value = label
        if (type === 'element') datalistEl.appendChild(opt)
        else if (type === 'text') datalistText.appendChild(opt)
    }

    // Validation nodeText selection
    const match = nodes.find(n => n.label === inputNode.value && n.type === 'text')
    if (!match) {
        inputOffset.value = ''
        inputOffset.max = ''
        inputOffset.disabled = true
    } else {
        inputOffset.disabled = false
        inputOffset.max = match.node.length
    }
}


const observer = new MutationObserver(() => updateDatalists())

observer.observe(editor, {
    childList: true,
    subtree: true,
    characterData: true,
})
updateDatalists()


function collectNodes(root, path = []) {
    const results = []
    Array.from(root.childNodes).forEach((node, i) => {

        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase()
            const newPath = [...path, `${tag}[${i}]`]
            results.push({ node, label: newPath.join(' > '), type: 'element' })
            results.push(...collectNodes(node, newPath))
        } else if (node.nodeType === 3) {
            const newPath = [...path, `#text[${i}]`]
            results.push({ node, label: newPath.join(' > '), type: 'text' })
        }
    })
    return results
}


// ...existing code...

let highlightTimeout  // debounce timer for highlight

function playInput() {
    const method = inputMethod.value
    const nodeLabel = inputNode.value

    // UI : switch datalist + masque offset si inutile
    if (method === 'setStartBefore' || method === 'setStartAfter') {
        inputOffset.parentNode.style.display = 'none'
        inputNode.setAttribute('list', 'node-list')
        if (inputOffset.value) {
            inputNode.value = ''
            resizeInput(inputNode)
        }
    } else {
        inputOffset.parentNode.style.display = ''
        inputNode.setAttribute('list', 'nodeText-list')
    }

    const expectedType = (method === 'setStartBefore' || method === 'setStartAfter') ? 'element' : 'text'
    const match = window.availableNodes?.find(n => n.label === nodeLabel && n.type === expectedType)
    if (!match) return

    // Mise à jour offset
    if (expectedType === 'text') {
        inputOffset.disabled = false
        inputOffset.max = match.node.length
    }

    // debounce highlight on text offset changes
    if (expectedType === 'text') {
        clearTimeout(highlightTimeout)
        highlightTimeout = setTimeout(() => highlight(match.node), 500)
    } else {
        highlight(match.node)
    }
}

// ...existing code...


function highlight(node) {
    const range = document.createRange()
    const sel = window.getSelection()
    sel.removeAllRanges()

    let offset = parseInt(inputOffset.value)
    if (inputOffset.value) {
        if (offset > node.length) offset = node.length
        else if (offset < 0) offset = 0
        range.setStart(node, offset)
        range.setEnd(node, offset)
        range.collapse(true)
    } else if (inputMethod.value !== 'setStart') {
        range[inputMethod.value](node)
    } else {
        range.selectNodeContents(node)
    }
    sel.addRange(range)
    if (inputOffset.value && offset !== parseInt(inputOffset.value))         inputOffset.value = offset
}

function refresh() {
    const sel = window.getSelection()
    if (sel.rangeCount) {
        const range = sel.getRangeAt(0)
        const node = range.startContainer
        const offset = range.startOffset
        inputNode.value = node.nodeName === '#text' ? node.parentNode.nodeName : node.nodeName
        inputOffset.value = offset
    } else {
        inputNode.value = ''
        inputOffset.value = ''
    }
    resizeInput(inputNode)
    resizeInput(inputOffset)
}