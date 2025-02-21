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
    tif_path = None
    output_raster = None
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
        
        for dirpath, dirnames, filenames in arcpy.da.Walk(zipFolder, type = 'TIF'):
            for filename in filenames:
                if filename.endswith('.tif'):
                    dataset_names.append(filename)
                    tif_path = os.path.join(dirpath, filename)
                    
        if len(dataset_names) == 0:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. No TIFF file in ZIP.'})
        elif len(dataset_names) > 1:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'INPUT FILE ERROR. More than one TIFF file are in ZIP.'})
            
    if not generalOutputInfo['error']:
        generalOutputInfo['infoMessages'].append({'message': dataset_names[0] + ' TIFF file is extracted.'})
        
        # Reading dataset capabilities
        desc = None
        try:
            desc = arcpy.Describe(tif_path)
            if desc.dataType != 'RasterDataset':
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Dataset is not a valid raster dataset.'})
            else:
                generalOutputInfo['infoMessages'].append({'message': 'Dataset is a raster.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read dataset capabilities.'})
    
    # Create raster object
    raster = None
    sp_ref = None
    if not generalOutputInfo['error']:
        try:
            raster = arcpy.Raster(tif_path)
            pixelType = raster.pixelType
            if raster.isInteger:
                generalOutputInfo['infoMessages'].append({'message': 'Raster has integer values. Pixel type: ' + pixelType + '.'})
            else:
                generalOutputInfo['infoMessages'].append({'message': 'Raster has float values. Pixel type: ' + pixelType + '.'})
                
            generalOutputInfo['infoMessages'].append({'message': 'Raster minimum value: ' + str(raster.minimum) + '.'})
            generalOutputInfo['infoMessages'].append({'message': 'Raster maximum value: ' + str(raster.maximum) + '.'})
            generalOutputInfo['infoMessages'].append({'message': 'Raster "No data" value: ' + str(raster.noDataValue) + '.'})
            
            sp_ref = raster.spatialReference.name
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read dataset capabilities.'})
            
    if not generalOutputInfo['error']:
        if raster.isMultidimensional:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Raster is multidimensional, can not process it. Please upload single dimensional raster.'})
            
    # Check if dataset has defined spatial reference
    if not generalOutputInfo['error']:
        if sp_ref == "Unknown":
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Raster spatial reference is not defined.'})
        else:
            generalOutputInfo['infoMessages'].append({'message': 'Raster spatial reference is ' + sp_ref})
            
    # Export raster to GDB 
    if not generalOutputInfo['error']:
        try:
            output_raster = os.path.join(work_gdb, 'raster_' + str(time))
            if not arcpy.Exists(output_raster):
                raster.save(output_raster)
                generalOutputInfo['infoMessages'].append({'message': 'Raster exported.'})
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Raster already exists.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to export raster.'})
                    
    if output_raster is not None:
        arcpy.SetParameter(1, output_raster)
    arcpy.SetParameter(2, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))