import { aditionalConfiguration, uiDeclaraiton, XibNode } from "../types";
import { shouldIgnoreProperty, ignoredTags, defaultRules } from "../rules";
import { Resolve } from "./CommonResolve";
import { capitalizeFirstLetter } from "../Utils";
import { resolveIdToPropetyName } from "./XibManipulator";

export class UIDeclarationsGen {

    public static initialization: string = '' 

    public generateUIDeclarations(subviews: XibNode[]): string {
        let uiDeclarations: string = '';
        for (const subview of subviews) {
            uiDeclarations += this.resolveUIDeclaration(subview.content);
        }
        return uiDeclarations;
    }

    private resolveUIDeclaration(nodes: XibNode[]): string {
        let uiDeclarations: string = '';
        nodes = nodes.filter(node => ignoredTags.includes(node.tag) == false);
    
        for (const node of nodes) {
            let property: string = this.resolveAtributes(node);
            property += `${this.generateDeclarationForSubNodes(node.tag, node.content)}`;
            uiDeclarations += `lazy var ${resolveIdToPropetyName(node.attrs.id)}: UI${capitalizeFirstLetter(node.tag)} = {\n\tlet ${node.tag} = UI${capitalizeFirstLetter(node.tag)}()${property}\treturn ${node.tag}\n}()\n\n`;
        }
        return uiDeclarations;
    }

    private resolveAtributes(node: XibNode): string {
        let attributes = node.attrs;
        let property: string = '\n';
    
        for (const key in attributes)  {
            if (shouldIgnoreProperty(node.tag, key)) continue;
            if (Resolve.propertyName(node.tag, key) != undefined) {
                let attributeDeclarion = `\t${node.tag}.${Resolve.propertyName(node.tag, key)} = ${Resolve.resultValue(attributes[key], key)}\n`;
                if (attributeDeclarion == `\t${node.tag}.${defaultRules[key]}\n`) continue;
                property += attributeDeclarion;
            } else {
                if (node.tag == 'imageView' && key == 'image') {
                    property += `\t${node.tag}.image = ${Resolve.Image(node)}\n`;
                    continue;
                }
                property += `\t${node.tag}.${key} = ${Resolve.resultValue(attributes[key], key)}\n`;
            }
        }
        return property;
    }

    private generateDeclarationForSubNodes(tag: string, nodes: XibNode[]): string {
        let property: string = '';
        for (const node of nodes) {
            property += this.resolveSubNode(tag, node);
        }
        return property;
    }

    private resolveSubNode(tag: string, node: XibNode): string {
        const addAditionalConfiguration: aditionalConfiguration = {
            'button': {
                'state': () => {                
                    let property = ``;
                    property += node.attrs.title != undefined ? `\t${tag}.setTitle("${node.attrs.title ?? ''}", for: .${node.attrs.key})\n` : '';
                    property += node.attrs.image != undefined ? `\t${tag}.setImage(${Resolve.Image(node)}, for: .${node.attrs.key})\n` : '';
                    property += node.attrs.backgroundImage != undefined ? `\t${tag}.setBackgroundImage(${Resolve.Image(node)}, for: .${node.attrs.key})\n` : '';
                   
                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'color') {
                            property += `\t${tag}.${node.attrs.key}(${Resolve.Color(child)}, for: .${node.attrs.key})\n`
                        }
                        else if (child.tag == 'imageReference') {
                            property += `\t${tag}.setImage(${Resolve.Image(child)}, for: .${node.attrs.key})\n`
                        }
                    }
                    return property;
                },
                'fontDescription': () => { 
                    let weight = node.attrs.weight != undefined ? `, weight: .${node.attrs.weight}` : '';
                    return `\t${tag}.titleLabel?.font = .systemFont(ofSize: ${node.attrs.pointSize}${weight})\n` 
                },
                'buttonConfiguration': () => { 
                    let property = `\t${tag}.configuration = .${node.attrs.style}()\n`;
                    property += `\t${tag}.setTitle("${node.attrs.title ?? ''}", for: .normal)\n`;

                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'color') {
                            property += `\t${tag}.configuration?.${child.attrs.key} = ${Resolve.Color(child)}\n`;
                        }
                    }
                    return property;
                },
            },
           'collectionView': {
                'collectionViewFlowLayout': () => {
                    let property = '\tlet layout = UICollectionViewFlowLayout()\n';
                    let ignoredAttributes = ['id', 'key'];
                    let attributes = node.attrs;
                    for (const key in attributes) {
                        if (ignoredAttributes.includes(key)) continue;
                        property += `\tlayout.${key} = ${Resolve.resultValue(attributes[key], key)}\n`;
                    }
                    for (const child of node.content) {
                        if (child.tag == 'size') {
                            property += `\tlayout.${child.attrs.key} = CGSize(width: ${child.attrs.width}, height: ${child.attrs.height})\n`;
                        }
                    }
                    property += `\t${tag}.collectionViewLayout = layout\n`;
                    return property;
                },
           },
            'common': {
                'color': () => { return `\t${tag}.${node.attrs.key} = ${Resolve.Color(node)}\n`},
                'fontDescription': () => { 
                    let weight = node.attrs.weight != undefined ? `, weight: .${node.attrs.weight}` : '';
                    return `\t${tag}.font = .systemFont(ofSize: ${node.attrs.pointSize}${weight})\n` 
                },
                //'rect': () => { return `\t${tag}.frame = CGRect(x: ${node.attrs.x}, y: ${node.attrs.y}, width: ${node.attrs.width}, height: ${node.attrs.height})\n` },
                'connections': () => {    
                    let property = '';
                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'action') {
                            property += `\t${tag}.addTarget(self, action: #selector(${child.attrs.selector.replace(':','')}), for: .${child.attrs.eventType})\n`;
                        }
                    }
                    return property
                },
                'userDefinedRuntimeAttributes': () => {
                    let property = '';
                    let children = node.content.filter(child => child.tag == 'userDefinedRuntimeAttribute');
                    for (const child of children) {
                        if (child.attrs.type == 'number') {
                            property += `\t${tag}.${child.attrs.keyPath} = ${child.attrs.value}\n`;
                        }
                        else if ( child.attrs.type == 'size') {
                            property += `\t${tag}.${child.attrs.keyPath} = CGSize(width: ${child.attrs.value}, height: ${child.attrs.value})\n`;
                        }
                        else if ( child.attrs.type == 'color') {
                            let color = child.content[0];
                            property += color != undefined ? `\t${tag}.${child.attrs.keyPath} = ${Resolve.Color(color)}\n` : '';
                        }
                    }
                    return property;
                },
            }
        }
        
        if (addAditionalConfiguration[tag] == undefined || addAditionalConfiguration[tag][node.tag] == undefined)  {
            return addAditionalConfiguration['common'][node.tag] != undefined ? addAditionalConfiguration['common'][node.tag]() : ''
        }
        return addAditionalConfiguration[tag][node.tag] != undefined ? addAditionalConfiguration[tag][node.tag]() : ''
    }
}