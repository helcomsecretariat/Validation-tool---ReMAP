import arcpy
import zipfile
import os
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    input_zip = arcpy.GetParameterAsText(0)
    geometry = arcpy.GetParameterAsText(1)
    shp_path = None
    output_fc = None
    output_fields = {}
    generalOutputInfo = {'error': False, 'infoMessages': []}
    # Path to the file geodatabase where intermediate temporary datasets are stored
    work_gdb = r'work.gdb'
    
    if not input_zip.endswith('.zip'):
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. Uploaded file is not ZIP.'})

    if not generalOutputInfo['error']:
        try:
            zipFolder = os.path.join(arcpy.env.scratchFolder, 'tmpzip_' + str(time))
            os.mkdir(zipFolder)
            zip2Extract = zipfile.ZipFile(input_zip, 'r')
            zip2Extract.extractall(zipFolder)
            zip2Extract.close()
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. Failed to extract ZIP folder.'})
            
    if not generalOutputInfo['error']:
        #thereAreValidFeatures = False
        dataset_names = []
        
        for dirpath, dirnames, filenames in arcpy.da.Walk(zipFolder, datatype = 'FeatureClass'):
            for filename in filenames:
                if filename.endswith('.shp'):
                    dataset_names.append(filename)
                    shp_path = os.path.join(dirpath, filename)
                    
        if len(dataset_names) == 0:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. No Shapefile in ZIP.'})
        elif len(dataset_names) > 1:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. More than one Shapefiles are in ZIP.'})
            
    if not generalOutputInfo['error']:
        generalOutputInfo['infoMessages'].append({'message': dataset_names[0] + ' Shapefile is extracted.'})
        
        # Reading dataset capabilities
        desc = None
        try:
            desc = arcpy.Describe(shp_path)
            generalOutputInfo['infoMessages'].append({'message': 'Capabilities of dataset fetched.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read dataset capabilities.'})
            
    # Check if dataset is ShapeFile
    if not generalOutputInfo['error']:
        if desc.dataType != 'ShapeFile':
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Dataset is not a Shapefile.'})
        else:
            generalOutputInfo['infoMessages'].append({'message': 'Dataset is a Shapefile.'})
            
    # Check if dataset has defined spatial reference
    if not generalOutputInfo['error']:
        if desc.spatialReference.name == "Unknown":
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Dataset spatial reference is not defined.'})
        else:
            generalOutputInfo['infoMessages'].append({'message': 'Dataset spatial reference is ' + desc.spatialReference.name})
            
    # Check dataset geometry
    if not generalOutputInfo['error']:
        if desc.shapeType.lower() == geometry:
            generalOutputInfo['infoMessages'].append({'message': 'Dataset geometry is ' + geometry + '.'})
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Dataset geometry is not ' + geometry + '.'})
    
    # Export Shapefile to GDB feature class
    if not generalOutputInfo['error']:
        try:
            #output_fc = os.path.join(arcpy.env.scratchGDB, 'fc_' + str(time))
            #arcpy.conversion.ExportFeatures(shp_path, output_fc)
            output_fc = arcpy.conversion.FeatureClassToFeatureClass(shp_path, work_gdb, 'fc_' + str(time))
            generalOutputInfo['infoMessages'].append({'message': 'Dataset exported for validation.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to export dataset ' + dataset_names[0] + ' for validation.'})
                    
    # Get dataset fields
    if not generalOutputInfo['error']:
        fields = None
        try:
            if arcpy.Exists(output_fc):
                fields = arcpy.ListFields(output_fc)
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Failed to save dataset ' + dataset_names[0] + ' for validation.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to get attributes of ' + dataset_names[0] + ' dataset.'})
    
    
    if not generalOutputInfo['error']:
        if fields is not None:
            generalOutputInfo['infoMessages'].append({'message': 'Dataset attributes fetched.'})
            excludeFields = ['GmlID', 'OBJECTID', 'Shape', 'Shape_Length', 'Shape_Area']
            for field in fields:
                if field.name not in excludeFields:
                    if field.type == 'String' and field.length > 0:
                        output_fields[field.name] = 'text[' + str(field.length) + ']'
                    if field.type == 'Integer' or field.type == 'SmallInteger':
                        output_fields[field.name] = 'integer'
                    if field.type == 'Double' or field.type == 'Single':
                        output_fields[field.name] = 'float'
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to get attributes of ' + dataset_names[0] + ' dataset.'})

    if output_fc is not None:
        arcpy.SetParameter(2, output_fc)
    arcpy.SetParameter(3, json.dumps(output_fields, ensure_ascii = False))
    arcpy.SetParameter(4, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))